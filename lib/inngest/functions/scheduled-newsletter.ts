import { inngest } from "@/lib/inngest/client";
import { fetchArticles } from "@/lib/news";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { marked } from "marked";
import { sendEmail } from "@/lib/email";
import { createClient } from "@/lib/client";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error(
    "Missing OPENROUTER_API_KEY in environment. Please set it in your .env file.",
  );
}

const openRouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export default inngest.createFunction(
  {
    id: "newsletter/scheduled",
    cancelOn: [
      {
        event: "newsletter.schedule.deleted",
        if: "async.data.userId == event.data.userId"
      },
    ],
  },
  { event: "newsletter.schedule" },
  async ({ event, step, runId }) => {
    const isUserActive = await step.run("check-user-status", async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("user_preferences")
        .select("is_active")
        .eq("user_id", event.data.userId)
        .single();

      if (error) {
        console.error("Error checking user status:", error);
        return false;
      }

      return data?.is_active || false;
    });

    if (!isUserActive) {
    }

    // const categories = ["technology", "business", "politics"];
    const categories = event.data.categories;

    // fetch articles per category
    const allArticles = await step.run("fetch-news", async () => {
      return fetchArticles(categories);
    });

    // generate AI summary
    const messages: ChatCompletionMessageParam[] = [
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
    ];

    const summary = await openRouter.chat.completions.create({
      model: "z-ai/glm-4.5-air:free",
      messages: messages,
    });

    // console.log(summary.choices[0]?.message?.content);

    const newsletterContent = summary.choices[0]?.message?.content;
    if (!newsletterContent) {
      throw new Error("Failed to generate newsletter content");
    }

    const htmlResult = await marked(newsletterContent);

    await step.run("send-email", async () => {
      await sendEmail(
        event.data.email,
        event.data.categories.join(", "),
        allArticles.length,
        htmlResult,
      );
    });

    await step.run("schedule-next", async () => {
      const now = new Date();
      let nextScheduleTime: Date;

      switch (event.data.frequency) {
        case "daily":
          nextScheduleTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case "weekly":
          nextScheduleTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "biweekly":
          nextScheduleTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
          break;
        default:
          nextScheduleTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      nextScheduleTime.setHours(9, 0, 0, 0);

      const {} = await inngest.send({
        name: "newsletter.schedule",
        data: {
          userId: event.data.userId,
          email: event.data.email,
          categories: event.data.categories,
          frequency: event.data.frequency,
        },
        ts: nextScheduleTime.getTime(),
      });

      console.log(
        `Next newsletter scheduled for: ${nextScheduleTime.toISOString()}`,
      );
    });

    const result = {
      newsletter: newsletterContent,
      articleCount: allArticles.length,
      categories: event.data.categories,
      emailSent: true,
      nextScheduled: true,
      success: true,
      runId: runId,
    };

    return result;
  },
);
