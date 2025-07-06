import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { CodingAssistant } from "./CodingAssistant";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">AI Coding Assistant</h2>
        <div className="text-sm text-gray-600">
          Free • No Sign-up Required
        </div>
      </header>
      <main className="flex-1">
        <CodingAssistant />
      </main>
      <Toaster />
    </div>
  );
}
