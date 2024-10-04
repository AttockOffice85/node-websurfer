import { HfInference } from '@huggingface/inference';

const huggingFaceAPIKey = process.env.HUGGING_FACE_API_KEY;

const inference = new HfInference(huggingFaceAPIKey); // Replace with your Hugging Face token

// Function to send content and get comment + reaction
export async function sendContentToGPT(htmlContent: string): Promise<{ comment: string; reaction: string }> {
    const prompt = `Here is a LinkedIn post: ${htmlContent}. Please provide a **brief**, two- to three-word appropriate comment and a **single-word** reaction from the options: like, love, support, insightful, funny. Return the response in JSON format: {"comment": "<your_comment>", "reaction": "<your_reaction>"}.`;

    let generatedText = '';
    console.log("htmlContent; ", htmlContent)

    // Stream the response from the model
    for await (const chunk of inference.chatCompletionStream({
        // model: "google/gemma-2-2b-it", // The model for instruction-following tasks
        model: "microsoft/Phi-3.5-mini-instruct", // The model for instruction-following tasks
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
    })) {
        // Accumulate the streamed response
        generatedText += chunk.choices[0]?.delta?.content || "";
    }
    console.log("generatedText:", { generatedText })

    // Try to parse the generated output into JSON
    try {
        const jsonResponse = JSON.parse(generatedText);
        console.log("jsonResponse:", { jsonResponse })
        return {
            comment: jsonResponse.comment || "No comment provided",
            reaction: jsonResponse.reaction || "No reaction provided",
        };
    } catch (error) {
        console.error("Failed to parse JSON response:", error);
        return {
            comment: "Parsing failed.",
            reaction: "Parsing failed.",
        };
    }
}
