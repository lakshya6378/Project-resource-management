import { AppError } from '../middleware/errorHandler';
import { systemConfigRepository, projectRepository } from '../repositories';
import { EmployeeSkill } from '../models';
import resourceService from './ResourceService';
import axios from 'axios';
import Timesheet from '../models/Timesheet';
import Allocation from '../models/Allocation';
import env from '../config/env';
/**
 * AiService — Core AI Module
 *
 * Uses the configured LLM Provider (GEMINI/GEMMA or GROQ) to dynamically
 * suggest a project team, perform organisation-wide searches, and generate risk summaries.
 */
class AiService {
  /**
   * Suggest a team for a specific project.
   */
  async suggestTeam(projectId, managerId, requirements = '') {
    const config = await systemConfigRepository.get();
    if (!config || !config.llmProvider) {
      throw new AppError('AI is not configured. Please contact the administrator.', 400);
    }

    const project = await projectRepository.findById(projectId);
    if (!project) throw new AppError('Project not found', 404);

    const projManagerId = project.managerId?._id || project.managerId;
    if (projManagerId.toString() !== managerId.toString()) {
      throw new AppError('You can only request AI suggestions for your own projects', 403);
    }

    // Manager-wide employee search
    const result = await resourceService.listEmployees({ managerId });
    const activeEmployees = result.employees.filter((emp) => emp.resourceData?.status !== 'INACTIVE');

    const availableStaff = await this._getStaffWithContext(activeEmployees);

    if (availableStaff.length === 0) {
      throw new AppError('No available employees found in your team with remaining capacity.', 400);
    }

    const prompt = this._buildSuggestTeamPrompt(project, availableStaff, requirements);
    return this._callLLM(prompt, config, true);
  }

  /**
   * AI Team Search (Organisation Wide)
   */
  async teamSearch(query, managerId) {
    const config = await systemConfigRepository.get();
    if (!config || !config.llmProvider) {
      throw new AppError('AI is not configured.', 400);
    }

    // Organisation-wide employee search
    const result = await resourceService.listEmployees({});
    const activeEmployees = result.employees.filter((emp) => emp.resourceData?.status !== 'INACTIVE');

    const availableStaff = await this._getStaffWithContext(activeEmployees);

    const prompt = `
You are an expert technical resource manager. 
A manager has requested the following team requirements:
"${query}"

--- AVAILABLE STAFF ACROSS ORGANISATION ---
${JSON.stringify(availableStaff, null, 2)}

--- INSTRUCTIONS ---
Define the whole team at once based on the requirements.
Run a single-pass best match: fill every role with the best available bench employee in one go. NEVER put the same person in two roles.
Be honest about gaps: if a role cannot be filled, tell the manager exactly which role and precisely why.
There are two kinds of "why" for gaps:
1. Nobody has the required skill (suggest to hire or train).
2. Someone has the skill but is allocated elsewhere until a specific date (so the manager can plan around their availability).

You MUST format your response as a valid JSON object matching the exact schema below:

{
  "rationale": "A brief overall explanation of your team composition strategy.",
  "rolesIdentified": ["Backend Developer", "Frontend Developer", ...],
  "suggestedTeam": [
    {
      "employeeId": "exact id from the staff list",
      "name": "Employee Name",
      "suggestedRole": "Role on this project",
      "suggestedUtilisation": 50,
      "rank": 1,
      "reasoning": "Why this specific employee was selected based on their skills and capacity."
    }
  ],
  "unfilledRoles": [
    {
      "role": "Role Name",
      "reasoning": "Exactly why it cannot be filled (e.g. nobody has the skill, or Bob has it but is allocated until YYYY-MM-DD)"
    }
  ]
}
`;
    return this._callLLM(prompt, config, true);
  }

  /**
   * AI Risk Summary
   */
  async generateRiskSummary(projectId, managerId) {
    const config = await systemConfigRepository.get();
    if (!config || !config.llmProvider) {
      throw new AppError('AI is not configured.', 400);
    }

    const project = await projectRepository.findById(projectId);
    if (!project) throw new AppError('Project not found', 404);

    const prompt = `
You are a project management AI assistant.
Analyze the following project and generate a concise risk summary (max 3 paragraphs).
Focus on deadlines, story points, and current status.

--- PROJECT DETAILS ---
Name: ${project.name}
Description: ${project.description || 'N/A'}
Status: ${project.status}
Story Points: ${project.totalStoryPoints || 0}
Start Date: ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}
End Date: ${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}

--- MILESTONES ---
${JSON.stringify(project.milestones, null, 2)}

Return plain text only, no JSON.
`;
    const res = await this._callLLM(prompt, config, false);
    return { summary: res };
  }

  // --- LLM Providers Implementation ---

  async _getStaffWithContext(activeEmployees) {
    const activeIds = activeEmployees.map(e => e._id);

    // Fetch declared skills
    const skills = await EmployeeSkill.find({ resourceId: { $in: activeIds } }).populate('skillId');
    const skillsMap = {};
    skills.forEach(s => {
      const empId = s.resourceId.toString();
      if (!skillsMap[empId]) skillsMap[empId] = [];
      skillsMap[empId].push(`${(s.skillId as any)?.name || 'Unknown'} (${s.proficiency})`);
    });

    // Fetch timesheet tags for context
    const timesheetTagsMap = {};
    for (const empId of activeIds) {
      const timesheets = await Timesheet.find({ resourceId: empId })
        .sort({ weekStart: -1 })
        .limit(env.TIMESHEET_HISTORY_WEEKS)
        .lean();

      const tagSet = new Set<string>();
      timesheets.forEach((ts: any) => {
        (ts.entries || []).forEach(entry => {
          (entry.activityTags || []).forEach(tag => tagSet.add(tag));
        });
      });
      timesheetTagsMap[empId.toString()] = Array.from(tagSet);
    }

    // Fetch max allocation dates for context
    const allocations = await Allocation.find({ resourceId: { $in: activeIds }, isActive: true }).lean();
    const allocMap = {};
    allocations.forEach((al: any) => {
      const empIdStr = al.resourceId.toString();
      const currentMax = allocMap[empIdStr];
      const alToDate = new Date(al.toDate);
      if (!currentMax || alToDate > currentMax) {
        allocMap[empIdStr] = alToDate;
      }
    });

    return activeEmployees
      .map((emp) => {
        const empIdStr = emp._id.toString();
        const baseSkills = skillsMap[empIdStr] || [];
        const recentTags = timesheetTagsMap[empIdStr] || [];
        
        let allSkills = [...baseSkills];
        if (recentTags.length > 0) {
          allSkills.push(`Recent Activity Tags: ${recentTags.join(', ')}`);
        }

        const maxAllocDate = allocMap[empIdStr];

        return {
          id: empIdStr,
          name: emp.fullName,
          department: (emp.departmentId as any)?.name || 'N/A',
          designation: (emp.designationId as any)?.title || 'N/A',
          availableCapacityPercent: 100 - (emp.resourceData?.currentUtilisation || 0),
          status: emp.resourceData?.status || 'N/A',
          allocatedUntil: maxAllocDate ? maxAllocDate.toLocaleDateString() : 'Available Now',
          skills: allSkills,
        };
      });
  }

  async _callLLM(prompt, config, expectJson) {
    try {
      if (config.llmProvider === 'GEMINI') {
        return await this._callRealGemini(prompt, config.llmApiKey, expectJson);
      } else if (config.llmProvider === 'GROQ') {
        return await this._callGroq(prompt, config.llmApiKey, expectJson);
      } else if (config.llmProvider === 'LOCAL_GEMMA') {
        return await this._callGemma(prompt, config.llmApiKey, expectJson);
      } else {
        throw new AppError(`Unsupported LLM Provider: ${config.llmProvider}`, 400);
      }
    } catch (error) {
      console.error('AI Call Error:', error);
      throw new AppError(`AI Generation failed: ${error.message}`, 500);
    }
  }

  async _callRealGemini(prompt, apiKey, expectJson) {
    if (!apiKey) throw new Error('Gemini API Key is missing in system config.');

    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: expectJson ? { responseMimeType: "application/json" } : undefined
    });

    let text = response.data.candidates[0].content.parts[0].text;
    if (expectJson) return this._extractJSON(text);
    return text;
  }

  async _callGemma(prompt, apiKey, expectJson) {
    if (!apiKey) throw new Error('LOCAL_GEMMA API Key is missing in system config.');

    const response = await axios.post('http://164.52.211.238/api/generate', {
      model: 'gemma3:12b-it-q8_0',
      prompt: prompt,
      stream: false
    }, {
      headers: { apiKey: `${apiKey}` }
    });

    let text = response.data.response;
    if (expectJson) return this._extractJSON(text);
    return text;
  }

  async _callGroq(prompt, apiKey, expectJson) {
    if (!apiKey) throw new Error('Groq API Key is missing in system config.');

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
      response_format: expectJson ? { type: 'json_object' } : undefined,
    }, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    let text = response.data.choices[0].message.content;
    if (expectJson) return this._extractJSON(text);
    return text;
  }

  _extractJSON(text) {
    const match = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
    const jsonStr = match ? match[1] : text;
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      // Fallback if no markdown block
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}') + 1;
      if (start !== -1 && end !== -1) {
        return JSON.parse(jsonStr.slice(start, end));
      }
      throw new Error('LLM returned malformed JSON');
    }
  }

  _buildSuggestTeamPrompt(project, staff, requirements) {
    return `
You are an expert technical resource manager. Your task is to analyze a project's requirements and select the best fit resources from the available staff.

--- PROJECT DETAILS ---
Name: ${project.name}
Description: ${project.description || 'N/A'}
Status: ${project.status}
Timeline: ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'} to ${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'TBD'}
${requirements ? `\n--- SPECIFIC MANAGER REQUIREMENTS ---\n${requirements}\n` : ''}
--- AVAILABLE STAFF ---
${JSON.stringify(staff, null, 2)}

--- INSTRUCTIONS ---
Define the whole team at once based on the requirements and project description.
Run a single-pass best match: fill every role with the best available bench employee in one go. NEVER put the same person in two roles.
Be honest about gaps: if a role cannot be filled, tell the manager exactly which role and precisely why.
There are two kinds of "why" for gaps:
1. Nobody has the required skill (suggest to hire or train).
2. Someone has the skill but is allocated elsewhere until a specific date (so the manager can plan around their availability).

Rank the selected employees according to their experience and skills.
You MUST format your response as a valid JSON object matching the exact schema below, without any markdown formatting, backticks, or extra text.

{
  "rationale": "A brief overall explanation of your team composition strategy for this project.",
  "rolesIdentified": ["Backend Developer", "Frontend Developer"],
  "suggestedTeam": [
    {
      "employeeId": "exact id from the staff list",
      "name": "Employee Name",
      "suggestedRole": "Role on this project",
      "suggestedUtilisation": 50,
      "rank": 1,
      "reasoning": "Why this specific employee was selected based on their skills and capacity."
    }
  ],
  "unfilledRoles": [
    {
      "role": "Role Name",
      "reasoning": "Exactly why it cannot be filled (e.g. nobody has the skill, or Bob has it but is allocated until YYYY-MM-DD)"
    }
  ]
}
`;
  }
}

export default new AiService();
