"use client"
import React, { useMemo, useRef, useState, useEffect } from "react";

// Add TypeScript interface for the UnicornStudio global object
declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized: boolean;
      init?: () => void;
    };
  }
}
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, SparklesIcon, Loader2Icon, XIcon, ClipboardIcon, Copy, Check, Key, AlertTriangle, RotateCcw, Loader2, WifiOff, ShieldAlert, Clock } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, dracula, materialOceanic, nightOwl, vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// Type definition for API error responses
interface ApiError {
  error: string;
  code?: string;
  message?: string;
}

// Error types for better categorization
type ErrorType = 'network' | 'auth' | 'timeout' | 'rate_limit' | 'validation' | 'server' | 'unknown';

// Enhanced error structure
interface EnhancedError {
  type: ErrorType;
  title: string;
  message: string;
  suggestion?: string;
  retryable: boolean;
}

type Status = "idle" | "editing" | "enhancing" | "complete" | "error";

interface EnhanceOptions {
  tone: string; length: string; audience: string; platform: string; temperature: number; extra?: string;
}

interface Props { endpoint?: string; className?: string }

export default function PromptEnhancerModal({ endpoint = "/api/enhance", className }: Props) {
  const [prompt, setPrompt] = useState("");
  const [enhanced, setEnhanced] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [showApiInput, setShowApiInput] = useState(true);
  const [errorDetails, setErrorDetails] = useState<EnhancedError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [opts, setOpts] = useState<EnhanceOptions>({
    tone: "neutral", length: "concise", audience: "general", platform: "any", temperature: 0.6, extra: "",
  });

  const charCount = prompt.length;
  const canEnhance = useMemo(() => prompt.trim().length > 0 && !isLoading, [prompt, isLoading]);

  function onChangePrompt(v: string) {
    setPrompt(v);
    if (status === "idle" && v.trim()) setStatus("editing");
    if (!v.trim()) setStatus("idle");
  }

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedKey = localStorage.getItem("groq-api-key");
    if (savedKey) {
      setApiKey(savedKey);
      setApiKeySaved(true);
    }
  }, []);
  
  // Update status when prompt or API key changes
  useEffect(() => {
    if (apiKey.trim() && prompt.trim()) {
      setStatus("editing");
    } else if (!prompt.trim()) {
      setStatus("idle");
    }
  }, [prompt, apiKey]);

  // Function to save API key to localStorage
  function saveApiKey() {
    if (apiKey.trim()) {
      localStorage.setItem("groq-api-key", apiKey);
      setApiKeySaved(true);
      // Set status to editing if we have a prompt
      if (prompt.trim()) {
        setStatus("editing");
      }
      console.log("API Key saved successfully");
    }
  }

  // Toggle API key input visibility
  function toggleApiKeyInput() {
    setShowApiInput(!showApiInput);
  }

  async function onEnhance() {
    if (!apiKey.trim() || !prompt.trim()) return;
    setIsLoading(true); 
    setStatus("enhancing"); 
    setEnhanced(""); 
    setCopied(false);
    setErrorDetails(null);
    
    const controller = new AbortController(); 
    abortRef.current = controller;
    
    try {
      // Add debug logging
      console.log("Making API request with key:", apiKey.substring(0, 4) + "...");
      
      // Add timestamp to bypass cache issues
      const timestamp = new Date().getTime();
      const endpointWithTimestamp = `${endpoint}?t=${timestamp}`;
      
      // Set up network timeout detection
      const networkTimeoutMs = 10000; // 10 seconds timeout for initial network connection
      const networkTimeoutId = setTimeout(() => {
        controller.abort();
        setErrorDetails({
          type: 'network',
          title: 'Network Connection Timeout',
          message: 'Unable to connect to the enhancement service. Your internet connection may be unstable.',
          suggestion: 'Check your internet connection and try again.',
          retryable: true
        });
        setIsLoading(false);
        setStatus("error");
      }, networkTimeoutMs);
      
      const res = await fetch(endpointWithTimestamp, { 
        method: "POST", 
        signal: controller.signal,
        cache: "no-store", 
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
          "Cache-Control": "no-cache"
        }, 
        body: JSON.stringify({ prompt, options: opts, apiKey }) 
      });
      
      // Clear network timeout if we got a response
      clearTimeout(networkTimeoutId);
      
      if (!res.ok) {
        let errorData;
        try {
          // First check if there's any content to parse
          const text = await res.text();
          
          if (!text || text.trim() === '') {
            // Handle empty response
            setErrorDetails({
              type: 'server',
              title: `Server Error (${res.status})`,
              message: 'The server returned an empty error response.',
              suggestion: 'This is likely a temporary issue. Please try again in a few moments.',
              retryable: true
            });
            console.error('Empty error response from server');
            setStatus("error");
            return;
          }
          
          try {
            // Try to parse as JSON
            errorData = JSON.parse(text);
            console.error('API error:', errorData);
            
            // Categorize errors for better user feedback
            if (errorData.code === 'AUTH_ERROR' || res.status === 401 || res.status === 403) {
              setErrorDetails({
                type: 'auth',
                title: 'API Key Authentication Failed',
                message: 'Your Groq API key could not be authenticated.',
                suggestion: '1. Verify you\'re using a valid Groq API key\n2. Check that the API key has not expired\n3. Ensure your account has sufficient credits',
                retryable: false
              });
            } else if (errorData.code === 'RATE_LIMIT_ERROR' || res.status === 429) {
              setErrorDetails({
                type: 'rate_limit',
                title: 'Rate Limit Exceeded',
                message: 'You\'ve sent too many requests in a short period of time.',
                suggestion: 'Please wait a moment before trying again.',
                retryable: true
              });
            } else if (errorData.code === 'TIMEOUT_ERROR' || res.status === 504) {
              setErrorDetails({
                type: 'timeout',
                title: 'Request Timed Out',
                message: 'The enhancement process took too long to complete.',
                suggestion: 'Try again with a shorter text or different options.',
                retryable: true
              });
            } else if (res.status >= 400 && res.status < 500) {
              setErrorDetails({
                type: 'validation',
                title: 'Invalid Request',
                message: errorData.error || 'Your request contains invalid parameters.',
                suggestion: errorData.message || 'Please check your input and try again.',
                retryable: true
              });
            } else {
              setErrorDetails({
                type: 'server',
                title: 'Server Error',
                message: errorData.error || 'An unexpected error occurred on the server.',
                suggestion: 'This is likely a temporary issue. Please try again later.',
                retryable: true
              });
            }
          } catch (parseError) {
            // If parsing as JSON fails, use the text as is
            setErrorDetails({
              type: 'unknown',
              title: `Error ${res.status}`,
              message: text || res.statusText,
              suggestion: 'This is an unexpected error. Please try again later.',
              retryable: true
            });
            console.error('Failed to parse error response as JSON:', parseError);
          }
          
          setStatus("error");
          return;
        } catch (textError) {
          // Handle case where even getting response text fails
          setErrorDetails({
            type: 'unknown',
            title: `Error ${res.status}`,
            message: res.statusText,
            suggestion: 'There was a problem processing the error response.',
            retryable: true
          });
          console.error('Failed to read error response text:', textError);
          setStatus("error");
          return;
        }
      }
      
      if (!res.body) {
        setErrorDetails({
          type: 'server',
          title: 'Invalid Response',
          message: 'No response data was received from the server.',
          suggestion: 'This is likely a temporary issue with the service. Please try again.',
          retryable: true
        });
        setStatus("error");
        return;
      }
      
      const reader = res.body.getReader(); 
      const decoder = new TextDecoder(); 
      let full = "";
      
      while (true) {
        const { value, done } = await reader.read(); 
        if (done) break;
        
        try {
          const chunk = decoder.decode(value, { stream: true }); 
          full += chunk; 
          setEnhanced((p) => p + chunk);
        } catch (decodeError) {
          console.error('Error decoding chunk:', decodeError);
          // Continue despite chunk decode error
        }
      }
      
      if (full.trim() === '') {
        setErrorDetails({
          type: 'server',
          title: 'Empty Response',
          message: 'The enhancement service returned an empty response.',
          suggestion: 'This might be due to a processing issue. Please try again.',
          retryable: true
        });
        setStatus("error");
        return;
      }
      
      setEnhanced(full); 
      setStatus("complete");
    } catch (e: any) {
      console.error('Request error:', e);
      
      // Handle specific error types with enhanced feedback
      if (e.name === 'AbortError') {
        // Only set error if we don't already have one (might be set by timeout)
        if (!errorDetails) {
          setErrorDetails({
            type: 'timeout',
            title: 'Request Cancelled',
            message: 'The enhancement request was cancelled.',
            suggestion: 'You can try again if needed.',
            retryable: true
          });
        }
      } else if (e.message?.includes('network') || e.message?.includes('fetch') || e.message?.includes('internet')) {
        setErrorDetails({
          type: 'network',
          title: 'Network Connection Error',
          message: 'Unable to connect to the enhancement service.',
          suggestion: 'Please check your internet connection and try again.',
          retryable: true
        });
      } else {
        setErrorDetails({
          type: 'unknown',
          title: 'Unexpected Error',
          message: e.message || 'Something went wrong with your request.',
          suggestion: 'Please try again. If the problem persists, try refreshing the page.',
          retryable: true
        });
      }
      
      setStatus("error");
    } finally { 
      setIsLoading(false); 
      abortRef.current = null; 
    }
  }

  function onAgain() {
    setEnhanced(""); setStatus(prompt.trim() ? "editing" : "idle");
  }

  async function onCopyMarkdown() {
    try {
      const md = extractMarkdownCodeblock(enhanced) || enhanced || "";
      await navigator.clipboard.writeText(md.trim());
      setCopied(true);
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      alert('Failed to copy to clipboard. Please try selecting and copying manually.');
    }setTimeout(() => setCopied(false), 1500);
  }

  function gradientByStatus(s: Status) {
    if (s === "enhancing") return "bg-gradient-to-b from-[#B5A200] to-[#4B4600]";
    if (s === "complete") return "bg-gradient-to-b from-[#00A651] to-[#004D29]";
    if (s === "error") return "bg-gradient-to-b from-[#A30000] to-[#4B0000]";
    return "bg-gradient-to-b from-[#1C1C1E] to-[#0D0D0F]";
  }
  
  // Helper function to get color scheme classes based on status
  function getColorScheme(s: Status) {
    if (s === "enhancing") return {
      border: "border-primary/30",
      bg: "bg-primary/5",
      text: "text-primary"
    };
    if (s === "complete") return {
      border: "border-accent/30",
      bg: "bg-accent/5",
      text: "text-accent"
    };
    if (s === "error") return {
      border: "border-red-500/30",
      bg: "bg-red-500/5",
      text: "text-red-500"
    };
    return {
      border: "border-border/50",
      bg: "bg-background",
      text: "text-foreground"
    };
  }

  function badgeByStatus(s: Status) {
    // Always show only the Powered by Groq badge
    return <Badge className="rounded-full bg-[#333333] text-[#999999] text-xs font-normal border-none px-4 py-1.5">Powered by Groq</Badge>;
  }

  useEffect(() => {
    // Initialize UnicornStudio when component mounts
    if (typeof window !== 'undefined' && !window.UnicornStudio?.isInitialized) {
      window.UnicornStudio = { isInitialized: false };
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
      script.onload = function() {
        // Check if UnicornStudio is defined and has required properties
        if (window.UnicornStudio && !window.UnicornStudio.isInitialized && window.UnicornStudio.init) {
          window.UnicornStudio.init();
          window.UnicornStudio.isInitialized = true;
        }
      };
      (document.head || document.body).appendChild(script);
    }
    
    return () => {
      // Cleanup if needed
    };
  }, []);
  
  return (
    <div className={"fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto " + (className||"")}>
      {/* Video Background */}
      <div 
        className="fixed inset-0 z-0" 
        style={{
          overflow: 'hidden',
          pointerEvents: 'none' // Prevents interactions with the background
        }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="object-cover w-full h-full"
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            objectFit: 'cover',
            filter: 'brightness(0.7) blur(2px)'
          }}
        >
          <source src="/video.webm" type="video/webm" />
        </video>
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        <Card className={`glass-panel shadow-xl backdrop-blur-sm transition-colors duration-300 ${getColorScheme(status).border}`}>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 pb-4 sm:pb-6">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <img src="/PRYMO-new.svg" alt="Prymo" className="h-6" />
            </CardTitle>
            <div className="self-start sm:self-auto">
              {badgeByStatus(status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Accordion type="single" collapsible className="mb-4 animated-focus-container rounded-xl border hover-effect bg-[#0f0f0f] overflow-hidden shadow-md">
              <AccordionItem value="api-key" className="border-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5 flex justify-between items-center transition-colors duration-300">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary/80" />
                    <span className="text-sm font-semibold">
                      {apiKeySaved ? "API Key Configured ✓" : "Configure Groq API Key"}
                    </span>
                  </div>
                  {apiKeySaved && (
                    <Badge className="bg-green-900/20 text-green-500 border border-green-500/20">
                      Saved
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="px-4 pt-2">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your Groq API Key..."
                        className="w-full h-10 px-3 py-2 text-sm rounded-xl border hover-effect bg-[#1a1a1a] text-foreground placeholder:text-muted-foreground p-4 shadow-md"
                        style={{
                          outline: 'none',
                          boxShadow: 'none',
                        }}
                      />
                      <Button 
                        onClick={saveApiKey} 
                        disabled={!apiKey.trim()} 
                        variant="primary" 
                        state={!apiKey.trim() ? "disabled" : "idle"}
                        className="font-medium shrink-0"
                      >
                        {apiKeySaved ? "Update Key" : "Save Key"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your key is stored locally in your browser and never sent to our servers.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div 
              className={`rounded-xl border hover-effect ${status !== 'idle' ? `border-${status === 'error' ? 'red-500/30' : status === 'enhancing' ? 'primary/30' : status === 'complete' ? 'accent/30' : 'border/30'}` : ''}  bg-[#121212] p-4 shadow-md`}>

              <Textarea
                value={prompt}
                onChange={(e) => onChangePrompt(e.target.value)}
                placeholder="Enter your text here to enhance it..."
                className="min-h-[140px] sm:min-h-[180px] bg-background focus-visible:ring-0 text-foreground placeholder:text-muted-foreground rounded-xl border-0"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-between gap-3 sm:gap-0 mt-3">
              {/* Always show character count for better UX */}
              <div className="flex items-center gap-1">
                <span className={`rounded-full transition-colors duration-300 ${prompt.length > 7500 ? 'bg-red-900/30 text-red-300' : prompt.length > 5000 ? 'bg-amber-900/30 text-amber-300' : 'bg-[#333333] text-[#999999]'} text-xs font-normal border-none px-3 sm:px-4 py-1 sm:py-1.5`}>
                  {prompt.length} / 8000 chars
                </span>
              </div>

              {/* Responsive layout handles this differently */}
              <div className="hidden sm:block"></div>

              {/* Show enhance button when appropriate */}
              {!isLoading && status !== "enhancing" && (
                <div className="w-full sm:w-auto">
                  {status === "error" ? (
                    <Button 
                      onClick={onEnhance} 
                      disabled={!apiKey.trim() || !prompt.trim()}
                      variant="destructive" 
                      state={!apiKey.trim() || !prompt.trim() ? "disabled" : "idle"}
                      className="w-full sm:w-auto font-medium"
                    >
                      Retry Enhancement
                    </Button>
                  ) : status === "complete" ? (
                    <Button 
                      onClick={onAgain} 
                      variant="success" 
                      className="w-full sm:w-auto font-medium"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" /> New Enhancement
                    </Button>
                  ) : (
                    <Button 
                      onClick={onEnhance} 
                      disabled={!apiKey.trim() || !prompt.trim()} 
                      variant="primary" 
                      state={!apiKey.trim() || !prompt.trim() ? "disabled" : "idle"}
                      className="w-full sm:w-auto font-medium"
                    >
                      {!apiKey.trim() ? "API Key Required" : "Enhance Text"}
                    </Button>
                  )}
                </div>
              )}
              
              {isLoading && (
                <Button 
                  disabled 
                  variant="warning" 
                  state="loading"
                  className="w-full sm:w-auto font-medium"
                >
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enhancing...
                </Button>
              )}
            </div>
            
            {/* Enhanced error message display with better categorization */}
            {status === "error" && errorDetails && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-900/10 p-4 text-red-400 flex flex-col items-start gap-3 shadow-md">
                <div className="flex items-center gap-2 w-full">
                  {errorDetails.type === 'network' ? (
                    <WifiOff className="h-5 w-5 text-red-400 shrink-0" />
                  ) : errorDetails.type === 'auth' ? (
                    <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
                  ) : errorDetails.type === 'timeout' || errorDetails.type === 'rate_limit' ? (
                    <Clock className="h-5 w-5 text-red-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
                  )}
                  <p className="font-medium">{errorDetails.title}</p>
                </div>
                <div className="w-full">
                  <p className="text-sm whitespace-pre-wrap">{errorDetails.message}</p>
                  {errorDetails.suggestion && (
                    <div className="mt-2 border-t border-red-500/10 pt-2">
                      <p className="text-xs font-medium mb-1">Suggestion:</p>
                      <p className="text-xs whitespace-pre-wrap">{errorDetails.suggestion}</p>
                    </div>
                  )}
                </div>
                <div className="w-full mt-2 border-t border-red-500/10 pt-2 flex justify-between">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setStatus(prompt.trim() ? "editing" : "idle")} 
                    className="text-xs h-7"
                  >
                    Back to Editing
                  </Button>
                  {errorDetails.retryable && (
                    <Button 
                      onClick={onEnhance} 
                      variant="destructive" 
                      size="sm"
                      className="text-xs h-7"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" /> Retry
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Always show the enhanced text area when in relevant states */}
            {(status === "enhancing" || status === "complete" || status === "error") && (
              <div className="mt-4">
                <Label className={`text-sm font-semibold transition-colors duration-300 ${status === 'error' ? 'text-red-400' : status === 'enhancing' ? 'text-primary' : status === 'complete' ? 'text-accent' : 'text-foreground'}`}>Enhanced Text</Label>
                <div className={`mt-2 px-4 py-4 max-h-[200px] sm:max-h-[260px] overflow-auto bg-[#151515] border hover-effect ${status === 'error' ? 'border-red-500/30' : status === 'enhancing' ? 'border-primary/30 pulse-border-primary' : status === 'complete' ? 'border-accent/30' : ''} rounded-xl shadow-md no-scrollbar`}>
                  <Markdown 
                    className="prose prose-invert max-w-none prose-headings:text-gray-300 prose-headings:font-medium prose-headings:mb-2 prose-headings:mt-4 prose-p:text-gray-400 prose-p:my-3 prose-pre:bg-transparent prose-pre:p-0 pl-0 text-sm sm:text-base"
                    components={{
                      code({className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '')
                        const language = match ? match[1] : ''
                        return match ? (
                          <SyntaxHighlighter
                            style={dracula}
                            language={language}
                            wrapLongLines={true}
                            customStyle={{
                              backgroundColor: 'transparent',
                              margin: 0,
                              padding: '4px 0'
                            }}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {/* Apply syntax highlighting to all content if it's not already in a code block */}
                    {enhanced ? '```typescript\n' + enhanced + '\n```' : ''}
                  </Markdown>
                </div>
                <div className="flex justify-end mt-2">
                  <Button 
                    variant={status === 'complete' ? "accent" : "secondary"}
                    size="sm" 
                    onClick={onCopyMarkdown} 
                    disabled={!enhanced.trim() || status === "enhancing"} 
                    state={!enhanced.trim() || status === "enhancing" ? "disabled" : "idle"}
                    className="gap-2"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy as Markdown"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function extractMarkdownCodeblock(text: string): string | null {
  if (!text) return null; const match = text.match(/```markdown\\n([\\s\\S]*?)```/i); return match ? match[1] : null;
}
