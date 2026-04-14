import { GoogleGenAI } from "@google/genai";import fs from "fs/promises";

const ai = new GoogleGenAI({ apiKey: "AIzaSyCv_ycELVvb0PifNFo0J0kfD0Tn722_71Y" });

async function main() {
  console.log("🎨 Vibe Coding with Gemini");
  const page = await fs.readFile("src/app/page.tsx", "utf-8").catch(() => "File not found");

  const res = await ai.models.generateContent({
    model: "gemini-1.5-flash", 
    contents: "Here is my Next.js page:\n" + page + "\n\nAdd a navigation bar to this app. Give complete code."
   
  });

  console.log(res.text);
}


main();
