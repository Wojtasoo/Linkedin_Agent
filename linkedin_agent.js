import { StateGraph, END, START } from "@langchain/langgraph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { OpenAI} from 'openai';
import { traceable } from "langsmith/traceable";
import { wrapOpenAI } from "langsmith/wrappers";
import { writeFile } from "fs/promises";

// SambaNova Chat Client implementation remains the same
class SambaNovaChatClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL;
    this.model = config.model || "Meta-Llama-3.1-405B-Instruct";
    this.temperature = config.temperature || 0;
  }

  async generateCompletion(messages) {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map(msg => ({
            role: msg.type === 'human' ? 'user' : 'assistant',
            content: msg.content
          })),
          temperature: this.temperature
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return new AIMessage(data.choices[0].message.content);
    } catch (error) {
      console.error("Error in SambaNova API call:", error);
      throw error;
    }
  }
}

// Custom Agent Creator remains the same
const createCustomAgent = traceable((config) => {
  let client;

  if (config.useOpenAI) {
    const openai = wrapOpenAI(new OpenAI(config));
    client = {
      generateCompletion: async (messages) => {
        const response = await openai.chat.completions.create({
          model: config.model || 'gpt-4o-mini',
          messages: messages.map((msg) => ({
            role: msg.type === 'human' ? 'user' : 'assistant',
            content: msg.content,
          })),
          temperature: config.temperature || 0,
        });
        return new AIMessage(response.choices[0].message.content);
      },
    };
  } else {
    client = new SambaNovaChatClient(config);
  }
  
  return {
    invoke: async ({ messages }, { configurable }) => {
      const response = await client.generateCompletion(messages);
      return {
        messages: [...messages, response],
        thread_id: configurable?.thread_id
      };
    }
  };
});

// Enhanced JSON parsing function
const safeJSONParse = (text) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
      throw new Error("Could not parse JSON from response");
    } catch (innerError) {
      console.error("JSON parsing failed:", text);
      throw innerError;
    }
  }
};

// Agent creation functions remain the same
const createProfileProcessor = () => {
  // return createCustomAgent({
  //   apiKey: os.getenv('SAMBANOVA_API_KEY'),
  //   baseURL: 'https://api.sambanova.ai/v1',
  //   model: 'Meta-Llama-3.1-405B-Instruct',
  //   temperature: 0
  // });

  return createCustomAgent({
    useOpenAI: true,
    apiKey: os.getenv('OPENAI_API_KEY'),
    model: 'gpt-4o-mini',
    temperature: 0,
  });
};

const createRequirementsExtractor = () => {
  // return createCustomAgent({
  //   apiKey: os.getenv('SAMBANOVA_API_KEY'),
  //   baseURL: 'https://api.sambanova.ai/v1',
  //   model: 'Meta-Llama-3.1-405B-Instruct',
  //   temperature: 0
  // });

  return createCustomAgent({
    useOpenAI: true,
    apiKey: os.getenv('OPENAI_API_KEY'),
    model: 'gpt-4o-mini',
    temperature: 0,
  });
};

const createSectionAnalyzer = (section) => {
  // return createCustomAgent({
  //   apiKey: os.getenv('SAMBANOVA_API_KEY'),
  //   baseURL: 'https://api.sambanova.ai/v1',
  //   model: 'Meta-Llama-3.1-405B-Instruct',
  //   temperature: 0
  // });

  return createCustomAgent({
    useOpenAI: true,
    apiKey: os.getenv('OPENAI_API_KEY'),
    model: 'gpt-4o-mini',
    temperature: 0,
  });
};

// Section analysis nodes with enhanced error handling
const sections = ["geo", "language", "education", "position", "skills", "certifications"];

// Updated workflow creation with proper state management
const createMatchingWorkflow = () => {
  const channels = {
    jobDescription: null,
    rawProfiles: [],
    processedProfiles: [],
    requiredSkills: {},
    current_step: "start",
    analysisResults: [],
    // Initialize analysis results for each section
    geo_analysis: {},
    language_analysis: {},
    education_analysis: {},
    position_analysis: {},
    skills_analysis: {},
    certifications_analysis: {}
  };

  const workflow = new StateGraph({
    channels: channels
  });

  // Updated initialize state with better validation
  workflow.addNode("initializeState", async (input) => {
    console.log("Initializing state with input:", input);
    
    // Validate job description
    if (!input?.jobDescription || typeof input.jobDescription !== 'string' || input.jobDescription.trim() === '') {
      throw new Error("Job description is required and must be a non-empty string");
    }

    // Validate raw profiles
    if (!Array.isArray(input?.rawProfiles)) {
      throw new Error("Raw profiles must be an array");
    }

    return {
      jobDescription: input.jobDescription.trim(),
      rawProfiles: input.rawProfiles,
      processedProfiles: [],
      requiredSkills: {},
      analysisResults: [],
      current_step: "initialized"
    };
  });

  // Process profiles with enhanced error handling
  workflow.addNode("processProfiles", async (state) => {
    console.log("Processing profiles with state:", state);
    const processor = createProfileProcessor();
    const processedProfiles = [];
    
    if (!Array.isArray(state.rawProfiles)) {
      throw new Error("Raw profiles must be an array");
    }

    for (const profile of state.rawProfiles) {
      if (!profile || typeof profile !== 'object') {
        console.warn("Invalid profile object:", profile);
        continue;
      }

      const profileContent = `
        Name: ${profile.firstName || ''} ${profile.lastName || ''}
        Current Position: ${profile.headline || ''}
        Location: ${profile.geo?.full || ''}
        Languages: ${(profile.languages || []).map(l => `${l.name} (${l.proficiency})`).join(', ')}
        Education: ${(profile.educations || []).map(e => `${e.degree} in ${e.fieldOfStudy} from ${e.schoolName}`).join(', ')}
        Experience: ${(profile.position || []).map(p => `${p.title} at ${p.companyName} (${p.start?.year} - ${p.end?.year || 'Present'})`).join(', ')}
        Skills: ${(profile.skills || []).map(s => s.name).join(', ')}
        Summary: ${profile.summary || ''}
      `;

      const prompt = new HumanMessage(
        `Analyze the profile content and return ONLY a JSON object of the following structure:
        {
          "geo": ["list of aviable locations of a person"],
          "language": ["list of languages spoken by a person"],
          "education": ["history of persons education"],
          "position": ["list positions the person has worked at"],
          "skills": ["list of skills that a person has"],
          "certifications": ["list of certifications of the person"]
        }
        Profile content to analyze: ${profileContent}
        DO NOT add anything else.`
      );

      try {
        const result = await processor.invoke(
          { messages: [prompt] },
          { configurable: { thread_id: `profile_processing_${profile.id}` } }
        );

        const sections = safeJSONParse(result.messages[result.messages.length - 1].content);
        processedProfiles.push({
          id: profile.id,
          sections,
          rawContent: profileContent
        });
      } catch (error) {
        console.error(`Error processing profile ${profile.id}:`, error);
      }
    }

    return {
      ...state,
      processedProfiles,
      current_step: "profiles_processed"
    };
  });

  // Extract requirements with validation
  workflow.addNode("extractRequirements", async (state) => {
    console.log("Extracting requirements with state:", state);
    
    if (!state.jobDescription) {
      throw new Error("Job description is missing from state");
    }

    const extractor = createRequirementsExtractor();
    const prompt = new HumanMessage(
      `Extract specific requirements from the job description and return ONLY a JSON object with this structure:
      {
        "geo": ["list of aviable locations"],
        "language": ["list of necessary languages"],
        "education": ["list of background majors or degrees that employee should have"],
        "position": ["position or job title"],
        "skills": ["list of skills desired in an employee"],
        "certifications": ["list of certficiations desired in an employee"]
      }
      Job Description: ${state.jobDescription}
      DO NOT add anything else.`
    );

    try {
      const result = await extractor.invoke(
        { messages: [prompt] },
        { configurable: { thread_id: "requirements_extraction" } }
      );

      const requiredSkills = safeJSONParse(result.messages[result.messages.length - 1].content);

      // Initiate parallel analysis
      const analysisPromises = sections.map(async (section) => {
        const analyzer = createSectionAnalyzer(section);
        const prompt = new HumanMessage(
          `Compare the profile's ${section} content with job requirements and return ONLY a JSON object of the following format:
          {
            "matchPercentage": percentage value,
            "relevantContent": ["list of relevant content from the profile"],
            "explanation": "Brief explanation of the matching analysis"
          }
          Profile ${section}: ${JSON.stringify(state.processedProfiles.map(p => p.sections[section]))}
          Required ${section}: ${JSON.stringify(requiredSkills[section])}
          DO NOT add anything else`
        );

        const sectionResults = {};
        for (const profile of state.processedProfiles) {
          try {
            const result = await analyzer.invoke(
              { messages: [prompt] },
              { configurable: { thread_id: `${section}_analysis_${profile.id}` } }
            );
            const analysisResult = safeJSONParse(result.messages[result.messages.length - 1].content);
            sectionResults[profile.id] = analysisResult;
          } catch (error) {
            console.error(`Error analyzing ${section} for profile ${profile.id}:`, error);
            sectionResults[profile.id] = {
              matchPercentage: 0,
              relevantContent: [],
              explanation: `Error analyzing ${section}`
            };
          }
        }

        return {
          [`${section}_analysis`]: sectionResults
        };
      });

      const analysisResults = await Promise.all(analysisPromises);
      const updatedState = analysisResults.reduce((state, sectionAnalysis) => {
        return {
          ...state,
          ...sectionAnalysis
        };
      }, { ...state, requiredSkills });

      return updatedState;
    } catch (error) {
      console.error("Error extracting requirements:", error);
      throw error;
    }
  });

  // Modified aggregation node
  workflow.addNode("aggregateResults", async (state) => {
    console.log("Aggregating results with state:", state);
    
    try {
      if (!state.processedProfiles || !Array.isArray(state.processedProfiles)) {
        throw new Error("Invalid state or missing processed profiles");
      }

      const finalResults = state.processedProfiles.map(profile => {
        const sectionScores = sections.map(section => {
          const sectionAnalysis = state[`${section}_analysis`];
          return sectionAnalysis?.[profile.id]?.matchPercentage || 0;
        });

        const sectionMatches = sections.reduce((acc, section) => {
          const sectionAnalysis = state[`${section}_analysis`];
          return {
            ...acc,
            [section]: sectionAnalysis?.[profile.id] || {
              matchPercentage: 0,
              relevantContent: [],
              explanation: "Analysis not available"
            }
          };
        }, {});

        return {
          profileId: profile.id,
          sectionMatches,
          overallMatch: sectionScores.reduce((acc, curr) => acc + curr, 0) / sections.length
        };
      });

      return {
        ...state,
        analysisResults: finalResults.sort((a, b) => b.overallMatch - a.overallMatch),
        current_step: "complete"
      };
    } catch (error) {
      console.error("Error in aggregating results:", error);
      throw error;
    }
  });

  // Define workflow edges
  workflow.addEdge(START, "initializeState");
  workflow.addEdge("initializeState", "processProfiles");
  workflow.addEdge("processProfiles", "extractRequirements");
  workflow.addEdge("extractRequirements", "aggregateResults");
  workflow.addEdge("aggregateResults", END);

  return workflow.compile();
};

// Updated main function with proper error handling
async function matchCandidates(jobDescription, profilesData) {
  if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim() === '') {
    throw new Error("Job description must be a non-empty string");
  }
  
  try {
    let profiles;
    if (typeof profilesData === 'string') {
      const fs = await import('fs/promises');
      const data = await fs.readFile(profilesData, 'utf8');
      profiles = JSON.parse(data);
    } else if (Array.isArray(profilesData)) {
      profiles = profilesData;
    } else {
      throw new Error("profilesData must be either a JSON file path or an array of profiles");
    }

    if (!Array.isArray(profiles)) {
      throw new Error("Parsed profiles data must be an array");
    }

    // Initialize state with all required properties
    const initialState = {
      jobDescription: jobDescription.trim(),
      rawProfiles: profiles,
      processedProfiles: [],
      requiredSkills: {},
      analysisResults: [],
      current_step: "start",
      config: {
        thread_id: `matching_${Date.now()}` // Add unique thread ID
      }
    };

    console.log("Starting matching process with initial state:", initialState);
    const workflow = createMatchingWorkflow();
    
    // Pass complete state object to workflow
    const result = await workflow.invoke(initialState);
    console.log("Matching process completed with result:", result);
    return result.analysisResults;
  } catch (error) {
    console.error("Error in matching process:", error);
    throw error;
  }
}

// Example usage
async function main() {
  try {
    const jobDescription = `
    We are seeking an experienced Senior Java Developer to join our dynamic team based in the Cracow Metropolitan Area. In this role, you will work on innovative software projects, leveraging your expertise in Java and related technologies to build scalable, high-performance applications for our clients. As a senior member of the team, you will also mentor junior developers, contribute to architectural decisions, and ensure code quality.

    Key Responsibilities:

    Develop and maintain Java-based applications, ensuring high performance, scalability, and reliability.
    Collaborate with cross-functional teams to design and implement new features and functionalities.
    Utilize Spring Framework and Hibernate for backend development.
    Work with RESTful APIs and Microservices architecture to build and enhance application features.
    Engage in code reviews, debugging, and optimizing performance to maintain coding standards.
    Mentor junior developers and provide technical guidance to improve team skillsets.
    Participate in Agile/Scrum development cycles, ensuring timely and high-quality deliverables.
    Maintain and update technical documentation.
    Requirements:

    Education: Bachelor's or Master’s degree in Applied Computer Science (Informatyka Stosowana) or a related field.
    Experience:
      7+ years of experience in Java development.
      Proven track record as a Senior Java Developer, ideally with experience at leading software development or consulting firms.
    Technical Skills:
      Proficient in Java, Spring Framework, Hibernate, and SQL.
      Experience with Microservices architecture, RESTful APIs, and frontend technologies like AngularJS.
      Familiarity with HTML, JavaScript, and database management.
    Languages:
      Polish (Native/Bilingual)
      English (Professional working proficiency)
    Nice to Have:
      Knowledge of other frontend frameworks or libraries.
      Experience working in consulting or software development environments.
  `.trim();
    const results = await matchCandidates(jobDescription, "candidates.json");
    console.log("Matching Results:", JSON.stringify(results, null, 2));

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    const fileName = `${dateString}_analysis_report.json`;
    await writeFile(fileName, JSON.stringify(results, null, 2));
    console.log(`Matching results saved to "${fileName}"`);

  } catch (error) {
    console.error("Error in main function:", error);
    process.exit(1);
  }
}

export { matchCandidates, createMatchingWorkflow};
main();