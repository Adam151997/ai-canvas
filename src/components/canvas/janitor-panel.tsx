"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  Sparkles,
  Layers,
  Search,
  Wand2,
  X,
} from "lucide-react";

interface JanitorPanelProps {
  canvasId: string;
  selectedContent?: string[];
  onSynthesisComplete?: (result: SynthesisResult) => void;
  onClusterComplete?: (result: ClusterResult) => void;
}

interface SynthesisResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  themes: string[];
}

interface ClusterResult {
  clusters: {
    name: string;
    items: string[];
    description: string;
  }[];
  connections: {
    from: string;
    to: string;
    relationship: string;
  }[];
}

export function JanitorPanel({
  canvasId,
  selectedContent = [],
  onSynthesisComplete,
  onClusterComplete,
}: JanitorPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [result, setResult] = useState<SynthesisResult | ClusterResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSynthesize = async () => {
    if (selectedContent.length === 0) {
      alert("Please select some content on the canvas first");
      return;
    }

    setIsLoading(true);
    setActiveAction("synthesize");

    try {
      const response = await fetch("/api/ai/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: selectedContent.join("\n\n"),
          type: "summarize",
        }),
      });

      if (!response.ok) throw new Error("Synthesis failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value);
      }

      try {
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as SynthesisResult;
          setResult(parsed);
          onSynthesisComplete?.(parsed);
        }
      } catch {
        setResult({
          summary: fullText,
          keyPoints: [],
          actionItems: [],
          themes: [],
        });
      }
    } catch (error) {
      console.error("Synthesis error:", error);
      alert("Failed to synthesize content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCluster = async () => {
    if (selectedContent.length < 2) {
      alert("Please select at least 2 items to cluster");
      return;
    }

    setIsLoading(true);
    setActiveAction("cluster");

    try {
      const response = await fetch("/api/ai/cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedContent,
          canvasId,
        }),
      });

      if (!response.ok) throw new Error("Clustering failed");

      const data = await response.json();
      setResult(data);
      onClusterComplete?.(data);
    } catch (error) {
      console.error("Cluster error:", error);
      alert("Failed to cluster content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setActiveAction("search");

    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          canvasId,
          topK: 10,
        }),
      });

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      setSearchResults(data.results);
    } catch (error) {
      console.error("Search error:", error);
      alert("Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-[200] flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        title="AI Janitor"
      >
        <Sparkles className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-[200] w-72 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-xl animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-r from-violet-500 to-purple-600">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-foreground">AI Janitor</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Selected indicator */}
        <div className="mb-3 rounded-md bg-muted/50 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground">
            {selectedContent.length > 0
              ? `${selectedContent.length} items selected`
              : "Select content to use AI"}
          </p>
        </div>

        {/* Actions */}
        <div className="mb-3 flex gap-1.5">
          <button
            onClick={handleSynthesize}
            disabled={isLoading || selectedContent.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-secondary px-2 py-1.5 text-[10px] font-medium text-secondary-foreground hover:bg-accent transition-colors disabled:opacity-40"
          >
            <Wand2 className="h-3 w-3" />
            Synthesize
          </button>
          <button
            onClick={handleCluster}
            disabled={isLoading || selectedContent.length < 2}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-secondary px-2 py-1.5 text-[10px] font-medium text-secondary-foreground hover:bg-accent transition-colors disabled:opacity-40"
          >
            <Layers className="h-3 w-3" />
            Cluster
          </button>
        </div>

        {/* Search */}
        <div className="mb-3 flex gap-1.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search canvas..."
            className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-accent transition-colors disabled:opacity-40"
          >
            <Search className="h-3 w-3" />
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Spinner size="sm" className="text-primary" />
          </div>
        )}

        {/* Results */}
        {!isLoading && result && activeAction === "synthesize" && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Summary</p>
              <p className="text-[11px] text-foreground">
                {(result as SynthesisResult).summary}
              </p>
            </div>
            {(result as SynthesisResult).themes?.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Themes</p>
                <div className="flex flex-wrap gap-1">
                  {(result as SynthesisResult).themes.map((theme, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && result && activeAction === "cluster" && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(result as ClusterResult).clusters?.map((cluster, i) => (
              <div key={i} className="rounded-md border border-border p-2">
                <p className="text-[11px] font-medium text-foreground">{cluster.name}</p>
                <p className="text-[10px] text-muted-foreground">{cluster.items.length} items</p>
              </div>
            ))}
          </div>
        )}

        {!isLoading && searchResults.length > 0 && activeAction === "search" && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {searchResults.map((result, i) => (
              <div key={i} className="rounded-md border border-border p-2 hover:bg-accent transition-colors cursor-pointer">
                <p className="text-[11px] text-foreground line-clamp-2">{result.text}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {Math.round((result.score || 0) * 100)}% match
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
