# Linkedin_Agent - Candidate Matching Workflow

This project implements a candidate matching workflow using LangGraph to analyze candidate profiles against a job description. It leverages OpenAI's GPT-4o-mini (or SambaNova's Meta-Llama-3.1-405B-Instruct) for natural language processing and JSON parsing to extract and compare relevant information.

## Features

-   **Profile Processing:** Extracts key information from candidate profiles, including geo-location, language skills, education, work experience, skills, and certifications.
-   **Requirement Extraction:** Identifies specific requirements from the job description in a structured JSON format.
-   **Section Analysis:** Compares each section of the candidate profile with the corresponding requirements from the job description, providing match percentages and relevant content.
-   **Result Aggregation:** Aggregates the section-wise analysis results to provide an overall match score for each candidate.
-   **Flexible API Integration:** Supports OpenAI's GPT-4o-mini and SambaNova's Meta-Llama-3.1-405B-Instruct for language model interactions.
-   **Robust Error Handling:** Includes comprehensive error handling for API calls, JSON parsing, and state management.
-   **Langsmith Tracing:** Uses Langsmith for tracing and debugging the workflow.
-   **File Output:** Saves the analysis results to a JSON file with a timestamped filename.

## Prerequisites

-   Node.js (v18 or higher)
-   npm or yarn
-   OpenAI API key (or SambaNova API key and base URL)
-   Langsmith API key (optional, for tracing)

## Installation

1.  Clone the repository:

    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  Install dependencies:

    ```bash
    npm install
    # or
    yarn install
    ```

3.  Set up environment variables:

    Create a `.env` file in the root directory of the project and add your API keys:

    ```plaintext
    OPENAI_API_KEY=your_openai_api_key
    # or
    SAMBANOVA_API_KEY=your_sambanova_api_key
    SAMBANOVA_BASE_URL=your_sambanova_base_url
    # optional langsmith
    LANGSMITH_API_KEY=your_langsmith_api_key
    ```

4. Place your candidates json file in the root directory, or change the path in the main function. Example of candidates.json:
    ```json
    [
      {
        "id": "1",
        "firstName": "John",
        "lastName": "Doe",
        "headline": "Senior Java Developer",
        "geo": { "full": "Cracow Metropolitan Area" },
        "languages": [ { "name": "Polish", "proficiency": "Native" }, { "name": "English", "proficiency": "Professional" } ],
        "educations": [ { "degree": "Master", "fieldOfStudy": "Applied Computer Science", "schoolName": "University of Cracow" } ],
        "position": [ { "title": "Senior Java Developer", "companyName": "TechCorp", "start": { "year": 2016 }, "end": { "year": 2023 } } ],
        "skills": [ { "name": "Java" }, { "name": "Spring Framework" }, { "name": "Hibernate" }, { "name": "SQL" }, { "name": "Microservices" } ],
        "summary": "Experienced Java developer..."
      },
      {
        "id": "2",
        "firstName": "Jane",
        "lastName": "Smith",
        "headline": "Java Developer",
        "geo": { "full": "Warsaw" },
        "languages": [ { "name": "English", "proficiency": "Professional" } ],
        "educations": [ { "degree": "Bachelor", "fieldOfStudy": "Computer Science", "schoolName": "Warsaw University" } ],
        "position": [ { "title": "Java Developer", "companyName": "SoftTech", "start": { "year": 2018 } } ],
        "skills": [ { "name": "Java" }, { "name": "Spring" }, { "name": "REST API" } ],
        "summary": "Java developer with experience in Spring..."
      }
    ]
    ```

## Usage

1.  Run the `main` function:

    ```bash
    node index.js
    ```

    This will execute the candidate matching workflow, analyze the candidates from `candidates.json` against the job description defined in the `main` function, and save the results to a JSON file with a timestamped filename.

2.  You can also import and use the `matchCandidates` and `createMatchingWorkflow` functions in your own projects:

    ```javascript
    import { matchCandidates, createMatchingWorkflow } from './index.js';

    async function runMatching() {
      const jobDescription = '...';
      const profilesData = 'candidates.json'; // or an array of profile objects
      const results = await matchCandidates(jobDescription, profilesData);
      console.log(results);
    }

    runMatching();
    ```

## Workflow Overview

1.  **Initialize State:** Validates and initializes the workflow state with the job description and raw profiles.
2.  **Process Profiles:** Extracts relevant information from each profile using the `createProfileProcessor` agent.
3.  **Extract Requirements:** Extracts job requirements from the job description using the `createRequirementsExtractor` agent.
4.  **Section Analysis:** Compares profile sections with job requirements using the `createSectionAnalyzer` agent.
5.  **Aggregate Results:** Aggregates section-wise analysis results to generate an overall match score for each candidate.
6.  **Complete:** Outputs the final analysis results.

## Customization

-   **API Selection:** Switch between OpenAI and SambaNova by modifying the `createCustomAgent` function and the agent creation functions.
-   **Prompt Engineering:** Modify the prompts in the agent creation functions to fine-tune the analysis.
-   **Section Analysis:** Add or remove sections in the `sections` array to customize the analysis.
-   **Output Format:** Modify the `aggregateResults` function to change the output format.
-   **Profiles Input:** Change the input of profiles to a database query, or other data source.

## Error Handling

The workflow includes robust error handling for API calls, JSON parsing, and state management. Errors are logged to the console, and the workflow attempts to continue processing other profiles or sections whenever possible.

## Langsmith Tracing

If you have a Langsmith API key, the workflow will automatically trace the execution, providing insights into the performance and behavior of the agents and the workflow.

## File Output

The final analysis results are saved to a JSON file with a timestamped filename, allowing you to easily review and analyze the matching results.
