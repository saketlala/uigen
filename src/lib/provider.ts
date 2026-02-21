import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: LanguageModelV1Message[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission here
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React, { useState } from 'react';

const features = [
  { icon: '⚡', label: 'Lightning Fast', desc: '10x faster performance' },
  { icon: '🔒', label: 'Secure', desc: 'Enterprise-grade security' },
  { icon: '🌍', label: 'Global CDN', desc: '99.99% uptime SLA' },
];

const plans = ['Starter', 'Pro', 'Enterprise'];

const avatars = ['🧑‍💻', '👩‍🎨', '🧑‍🚀', '👨‍🔬'];

const Card = ({
  title = "Premium Experience",
  description = "Discover amazing features and capabilities that will transform your workflow forever.",
}) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(42);
  const [selectedPlan, setSelectedPlan] = useState('Pro');
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(c => liked ? c - 1 : c + 1);
  };

  const handleAdd = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm w-full" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Hero */}
      <div className="relative h-44 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 overflow-hidden">
        {/* Blobs */}
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white opacity-10" />
        <div className="absolute bottom-0 -left-8 w-40 h-40 rounded-full bg-indigo-400 opacity-20" />
        <div className="absolute top-8 left-1/2 w-24 h-24 rounded-full bg-purple-300 opacity-10" />

        {/* Top row */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">✦ PRO</span>
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/30 hover:bg-white/30 transition-all"
          >
            <span style={{ transition: 'transform 0.2s', transform: liked ? 'scale(1.3)' : 'scale(1)', color: liked ? '#f87171' : 'white' }}>♥</span>
            {likeCount}
          </button>
        </div>

        {/* Title in hero */}
        <div className="absolute bottom-5 left-5 right-5">
          <h2 className="text-white text-xl font-bold leading-tight">{title}</h2>
          <div className="flex items-center gap-1 mt-1">
            {'★★★★★'.split('').map((s, i) => (
              <span key={i} className="text-amber-300 text-xs">{s}</span>
            ))}
            <span className="text-white/70 text-xs ml-1">4.9 · 2.4k reviews</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-4">
        {['overview', 'features', 'team'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={\`flex-1 py-3 text-xs font-semibold capitalize transition-all \${activeTab === tab ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-400 hover:text-gray-600'}\`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-5 pt-4 pb-2 min-h-28">
        {activeTab === 'overview' && (
          <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
        )}
        {activeTab === 'features' && (
          <div className="space-y-3">
            {features.map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-base">{f.icon}</div>
                <div>
                  <div className="text-xs font-semibold text-gray-800">{f.label}</div>
                  <div className="text-xs text-gray-400">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'team' && (
          <div>
            <div className="flex -space-x-2 mb-2">
              {avatars.map((a, i) => (
                <div key={i} className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-base border-2 border-white">{a}</div>
              ))}
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 border-2 border-white">+18</div>
            </div>
            <p className="text-xs text-gray-400">22 contributors · Last active 2h ago</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-gray-100 mx-5 my-3 rounded-2xl overflow-hidden">
        {[['12k', 'Users'], ['98%', 'Uptime'], ['4.9★', 'Rating']].map(([val, label]) => (
          <div key={label} className="bg-white py-3 text-center">
            <div className="text-sm font-bold text-gray-800">{val}</div>
            <div className="text-xs text-gray-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Plan selector */}
      <div className="px-5 mb-4">
        <div className="flex gap-2">
          {plans.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPlan(p)}
              className={\`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all \${selectedPlan === p ? 'bg-violet-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}\`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing + CTA */}
      <div className="px-5 pb-5 flex items-center gap-3">
        <div>
          <div className="text-2xl font-extrabold text-gray-900">
            {selectedPlan === 'Starter' ? '$9' : selectedPlan === 'Pro' ? '$29' : '$99'}
            <span className="text-sm font-normal text-gray-400">/mo</span>
          </div>
          <div className="text-xs text-gray-400">Billed annually</div>
        </div>
        <button
          onClick={handleAdd}
          className={\`flex-1 py-3 rounded-2xl text-sm font-bold transition-all duration-300 \${added ? 'bg-green-500 text-white' : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 active:scale-95'}\`}
        >
          {added ? '✓ Added!' : 'Get Started →'}
        </button>
      </div>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1);
  };

  const decrement = () => {
    setCount(count - 1);
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Counter</h2>
      <div className="text-4xl font-bold mb-6">{count}</div>
      <div className="flex gap-4">
        <button 
          onClick={decrement}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Decrease
        </button>
        <button 
          onClick={reset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
        <button 
          onClick={increment}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Increase
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);";
      case "card":
        return '      <div className="p-6">';
      default:
        return "  const increment = () => setCount(count + 1);";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);\n    alert('Thank you! We\\'ll get back to you soon.');";
      case "card":
        return '      <div className="p-6 hover:bg-gray-50 transition-colors">';
      default:
        return "  const increment = () => setCount(prev => prev + 1);";
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Card 
          title="Amazing Product"
          description="This is a fantastic product that will change your life. Experience the difference today!"
          actions={
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
              Learn More
            </button>
          }
        />
      </div>
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <${componentName} />
      </div>
    </div>
  );
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    // Collect all stream parts
    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    // Build response from parts
    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    // Get finish reason from finish part
    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0");
  }

  return anthropic(MODEL);
}
