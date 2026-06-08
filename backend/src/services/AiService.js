const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  systemConfigRepository,
  employeeRepository,
  projectRepository,
} = require('../repositories');
const { AppError } = require('../middleware/errorHandler');

/**
 * AiService — Core AI Module
 *
 * Uses the configured LLM Provider (GEMINI or GROQ) to dynamically
 * suggest a project team based on the project's description and
 * the active employees' skills and current workloads.
 */
class AiService {
  /**
   * Suggest a team for a specific project.
   *
   * @param {string} projectId - The ID of the project to staff
   * @param {string} managerId - The manager requesting the suggestion
   * @returns {Object} JSON object containing the suggested team
   */
  async suggestTeam(projectId, managerId) {
    // 1. Fetch System Configuration
    const config = await systemConfigRepository.get();
    if (!config || !config.llmApiKey) {
      throw new AppError(
        'AI is not configured. Please contact the administrator to set the LLM Provider and API Key.',
        400
      );
    }

    // 2. Fetch and Validate Project
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const projManagerId = project.managerId?._id || project.managerId;
    if (projManagerId.toString() !== managerId.toString()) {
      throw new AppError('You can only request AI suggestions for your own projects', 403);
    }

    // 3. Gather Employee Data (The Context)
    // We only consider active employees who are not 100% utilized
    const activeEmployees = await employeeRepository.findAll({ isActive: true });
    
    // Filter out fully allocated employees and format the data tightly to save tokens
    const availableStaff = activeEmployees
      .filter((emp) => emp.currentUtilisation < 100)
      .map((emp) => ({
        id: emp._id.toString(),
        name: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        availableCapacityPercent: 100 - emp.currentUtilisation,
        status: emp.status,
        skills: emp.skills.map((s) => `${s.name} (${s.proficiencyLevel})`),
      }));

    if (availableStaff.length === 0) {
      throw new AppError('No available employees found with remaining capacity.', 400);
    }

    // 4. Construct the Prompt
    const prompt = this._buildPrompt(project, availableStaff);

    // 5. Call the LLM
    try {
      if (config.llmProvider === 'GEMINI') {
        return await this._callGemini(prompt, config.llmApiKey);
      } else if (config.llmProvider === 'GROQ') {
        // Fallback/stub for GROQ
        throw new AppError('GROQ provider is currently not implemented. Please use GEMINI.', 501);
      } else {
        throw new AppError(`Unsupported LLM Provider: ${config.llmProvider}`, 400);
      }
    } catch (error) {
      console.error('AI Suggestion Error:', error);
      throw new AppError(`AI Suggestion failed: ${error.message}`, 500);
    }
  }

  /**
   * Build the prompt for the LLM.
   * @private
   */
  _buildPrompt(project, staff) {
    return `
You are an expert technical resource manager. Your task is to analyze a project's requirements and select the best team from the available staff.

--- PROJECT DETAILS ---
Name: ${project.name}
Description: ${project.description}
Status: ${project.status}
Timeline: ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'} to ${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'TBD'}

--- AVAILABLE STAFF ---
${JSON.stringify(staff, null, 2)}

--- INSTRUCTIONS ---
Based on the project description, deduce the likely technical roles and skills required.
Then, select the most suitable candidates from the Available Staff list.
Consider their skills, proficiency levels, and available capacity.
Do not select more people than necessary.
You MUST format your response as a valid JSON object matching the exact schema below, without any markdown formatting, backticks, or extra text.

{
  "rationale": "A brief overall explanation of your team composition strategy for this project.",
  "rolesIdentified": ["Backend Developer", "Frontend Developer", ...],
  "suggestedTeam": [
    {
      "employeeId": "exact id from the staff list",
      "name": "Employee Name",
      "suggestedRole": "Role on this project",
      "suggestedUtilisation": 50,
      "reasoning": "Why this specific employee was selected based on their skills and capacity."
    }
  ]
}
`;
  }

  /**
   * Call Google Gemini API using the official SDK.
   * @private
   */
  async _callGemini(prompt, apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash as it is fast and excellent for structured JSON extraction
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse Gemini JSON:', text);
      throw new Error('LLM returned malformed JSON');
    }
  }
}

module.exports = new AiService();
