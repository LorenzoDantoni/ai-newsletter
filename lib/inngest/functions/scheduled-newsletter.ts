import { inngest } from "@/lib/inngest/client";
import { fetchArticles } from "@/lib/news";

export default inngest.createFunction(
  { id: "newsletter/scheduled" },
  { event: "newsletter.schedule" },
  async ({ event, step, runId }) => {
    const categories = ["technology", "business", "politics"];

    // fetch articles per category
    const allArticles = await step.run("fetch-news", async () => {
      return fetchArticles(categories);
    });

    // generate AI summary
    const summary = await step.ai.infer("summarize-news", {
      model: step.ai.models.openai({ model: "openai/gpt-oss-20b:free" }),
      body: {
        messages: [
          {
            role: "system",
            content: `You are an expert newsletter editor creating a personalized newsletter. 
              Write a concise, engaging summary that:
              - Highlights the most important stories
              - Provides context and insights
              - Uses a friendly, conversational tone
              - Is well-structured with clear sections
              - Keeps the reader informed and engaged
              Format the response as a proper newsletter with a title and organized content.
              Make it email-friendly with clear sections and engaging subject lines.`,
          },
          {
            role: "user",
            content: `Create a newsletter summary for these articles from the past week. 
              Categories requested: ${categories.join(", ")}
              
              Articles:
              ${allArticles
                .map(
                  (article: any, idx: number) =>
                    `${idx + 1}. ${article.title}\n  ${article.description}\n  Source: ${article.url}\n`,
                )
                .join("\n")}
              `,
          },
        ],
      },
    });

    console.log(summary.choices[0].message.content);
  },
);
