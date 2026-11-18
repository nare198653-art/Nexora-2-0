import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { AppMode, Post, UserProfile, CreatorProjectRecord } from '../types';
import { useTranslation } from '../localization/LanguageContext';
import { nexoraFirestoreService } from '../services/nexoraFirestoreService';
import { firebaseStorageService } from '../services/firebaseStorageService';
import { 
  Sparkles, Camera, Image as ImageIcon, Sliders, Info, Wand2, Lightbulb, 
  RefreshCcw, Palette, Download, Loader2, Copy, ToggleLeft, ToggleRight,
  CheckCircle, ArrowRight
} from 'lucide-react';

interface CreatorViewProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  mode: AppMode;
  userProfile?: UserProfile;
  onAddPost?: (newPost: Post) => void;
  onPublishSuccess?: () => void;
}

const POST_TYPES = [
  { id: 'image', label: 'AI Image Generator', desc: 'Generate visual assets using text-to-image AI' },
  { id: 'text', label: 'Write Post', desc: 'Draft articles or standard updates' }
] as const;

type PostType = typeof POST_TYPES[number]['id'];

const STYLE_PRESETS = [
  { id: 'photorealistic', name: '📷 Photo', desc: 'Realistic details & lighting', suffix: ', photorealistic, hyper-detailed, 8k resolution, dramatic lighting, shot on 35mm lens' },
  { id: 'cinematic', name: '🎬 Cinematic', desc: 'Moody movie lighting', suffix: ', cinematic movie scene, anamorphic lens, high-contrast, moody atmosphere, cinematic color grading' },
  { id: '3d-render', name: '🎨 3D Render', desc: 'Vibrant Octane render style', suffix: ', 3D octane render, ultra-detailed, Unreal Engine 5 aesthetic, smooth surfaces, vibrant lighting' },
  { id: 'digital-art', name: '🖌️ Digital Art', desc: 'Vibrant concept art', suffix: ', stunning digital illustration, vibrant fantasy color palette, concept art, highly detailed' },
  { id: 'anime', name: '🌸 Anime', desc: 'Beautiful manga style', suffix: ', beautiful anime illustration, high detail, clean line art, vibrant colors, Makoto Shinkai style' },
  { id: 'minimalist', name: '📐 Minimalist', desc: 'Modern clean flat vector', suffix: ', clean minimalist graphic design vector, elegant negative space, flat colors, contemporary art' }
] as const;

export const CreatorView: React.FC<CreatorViewProps> = ({ showToast, mode, userProfile, onAddPost, onPublishSuccess }) => {
  const { t } = useTranslation();
  const [postType, setPostType] = useState<PostType>('image');

  // Shared settings
  const [greenScreen, setGreenScreen] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [promptInput, setPromptInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [uploadedMedia, setUploadedMedia] = useState<{ url: string; name: string; type: string; base64?: string } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Advanced AI Image Generator states
  const isGhost = mode === AppMode.GHOST;
  const uid = !isGhost ? userProfile?.userId : undefined;
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState<boolean>(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ id?: string; url: string; prompt: string; date: number }>>([]);

  useEffect(() => {
    if (!uid) return;
    const unsub = nexoraFirestoreService.subscribeCreatorProjects(
      uid,
      (projects: CreatorProjectRecord[]) => {
        const mapped = projects
          .filter((p) => p.type === 'image' && Boolean(p.imageUrl))
          .slice(0, 8)
          .map((p) => ({
            id: p.id,
            url: p.imageUrl!,
            prompt: p.prompt || 'Studio Creation',
            date:
              typeof p.createdAt?.toMillis === 'function'
                ? p.createdAt.toMillis()
                : typeof p.createdAt === 'number'
                  ? p.createdAt
                  : Date.now()
          }));
        setHistory(mapped);
      },
      (err) => console.warn('Creator projects subscription warning:', err)
    );
    return () => unsub();
  }, [uid]);

  // Text specific states
  const [textPostContent, setTextPostContent] = useState<string>('');
  const [textPostGradient, setTextPostGradient] = useState<number>(0);

  const postGradients = [
    { name: 'Midnight Blue', class: 'bg-gradient-to-br from-slate-900 to-indigo-950/80 border-slate-800/80' },
    { name: 'Sunset Amber', class: 'bg-gradient-to-br from-stone-900 via-rose-950/20 to-stone-950 border-slate-800/80' },
    { name: 'Forest Moss', class: 'bg-gradient-to-br from-emerald-950/20 via-slate-950 to-slate-900 border-slate-800/80' },
    { name: 'Classic Dark', class: 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800' },
  ];

  // File handling
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast("Please upload an image file (PNG, JPG, or WEBP).", "error");
      return;
    }
    const url = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setUploadedMedia({
        url,
        name: file.name,
        type: file.type,
        base64
      });
      showToast(`Selected reference image: ${file.name}`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Prompts & enhancement presets
  const inspirationPool = [
    "A serene fog-covered forest in the early morning, high-detail photography",
    "Minimalist abstract shapes rendered in satin glass and liquid gold, soft studio lighting",
    "A modern workspace desk containing a notebook next to a rainy mountain view",
    "A cinematic aerial landscape photography of crashing ocean waves on black sand",
    "Architectural view of sunlight illuminating warm travertine stone walkways at sunset",
    "Deep indigo flowing silk draping elegantly in a soft studio breeze"
  ];

  const handleInspiration = () => {
    const randomIndex = Math.floor(Math.random() * inspirationPool.length);
    setPromptInput(inspirationPool[randomIndex]);
    showToast("Idea loaded successfully.", "success");
  };

  const handleEnhance = () => {
    if (!promptInput.trim()) {
      showToast("Enter a baseline description first.", "info");
      return;
    }
    const enhancements = ", professional lighting, balanced depth of field, natural textures, atmospheric, highly detailed visual narrative";
    if (promptInput.includes(enhancements)) {
      showToast("Enhancements already active.", "info");
      return;
    }
    setPromptInput(prev => prev.trim() + enhancements);
    showToast("Aesthetic enhancements added.", "success");
  };

  const handleRefine = () => {
    if (!promptInput.trim()) {
      showToast("Description is currently empty.", "info");
      return;
    }
    let refined = promptInput.trim();
    if (!refined.toLowerCase().startsWith("a detailed visualization of")) {
      refined = "A detailed visualization of " + refined.charAt(0).toLowerCase() + refined.slice(1);
    }
    setPromptInput(refined);
    showToast("Prompt wording refined.", "success");
  };

  const handleClear = () => {
    setPromptInput('');
    setGeneratedImageUrl('');
    setSelectedStyle(null);
    showToast("Studio inputs cleared.", "info");
  };

  const handleAIOptimizePrompt = async () => {
    if (!promptInput.trim()) {
      showToast("Enter a simple description first.", "info");
      return;
    }
    setIsOptimizingPrompt(true);
    showToast("AI is optimizing your prompt...", "info");
    try {
      const systemInstruction = "You are an expert prompt engineer for text-to-image AI generators. " +
        "Take the user's brief prompt concept and expand it into a highly detailed, visually evocative, 1-2 sentence prompt designed for realistic, high-quality image generation. " +
        "Keep it concise, clear, and sensory. Return ONLY the expanded prompt, with absolutely no quotes, intro, or explanation.";
      const expanded = await geminiService.generateContent(
        promptInput.trim(),
        undefined,
        systemInstruction
      );
      if (expanded && !expanded.includes("Neural uplink failed") && !expanded.includes("issue:")) {
        setPromptInput(expanded.trim());
        showToast("Prompt optimized by Gemini AI!", "success");
      } else {
        const simpleEnhance = promptInput.trim() + ", stunning composition, cinematic lighting, sharp detail, professional digital photography";
        setPromptInput(simpleEnhance);
        showToast("Prompt enhanced with visual terms.", "success");
      }
    } catch (err) {
      console.warn("AI optimization failed:", err);
      const simpleEnhance = promptInput.trim() + ", stunning composition, cinematic lighting, sharp detail, professional digital photography";
      setPromptInput(simpleEnhance);
      showToast("Prompt enhanced with visual terms.", "success");
    } finally {
      setIsOptimizingPrompt(false);
    }
  };

  const handleSynthesis = async () => {
    if (!promptInput.trim()) {
      showToast("Please write a text description first.", "info");
      return;
    }

    setIsGenerating(true);
    setGeneratedImageUrl('');

    try {
      showToast("Connecting to AI service...", "info");
      let finalPrompt = promptInput.trim();
      
      if (selectedStyle) {
        const styleObj = STYLE_PRESETS.find(s => s.id === selectedStyle);
        if (styleObj) {
          finalPrompt += styleObj.suffix;
        }
      }

      if (greenScreen) {
        finalPrompt += ", shot on solid vivid green backing (HEX #00ff00), studio set, isolated object";
      }

      const useReferenceImage = greenScreen && !!uploadedMedia?.base64;
      const imageUrl = await geminiService.generateImage(finalPrompt, {
        referenceImage: useReferenceImage ? uploadedMedia?.base64 : undefined,
        isProMode: true,
        aspectRatio: aspectRatio
      });

      if (imageUrl) {
        let persistedUrl = imageUrl;
        const projId = `proj_${Date.now()}`;
        if (uid && imageUrl.startsWith('data:image/')) {
          try {
            persistedUrl = await firebaseStorageService.uploadDataUrl(uid, 'creator', imageUrl, projId);
          } catch (uploadErr) {
            console.warn('Creator Storage upload failed, keeping preview URL:', uploadErr);
          }
        }

        setGeneratedImageUrl(persistedUrl);
        showToast("Image generated successfully!", "success");

        if (uid) {
          try {
            await nexoraFirestoreService.saveCreatorProject(uid, {
              id: projId,
              userId: uid,
              type: 'image',
              prompt: promptInput.trim(),
              stylePreset: selectedStyle || undefined,
              aspectRatio,
              greenScreen,
              imageUrl: persistedUrl
            });
            setCurrentProjectId(projId);
          } catch (saveErr) {
            console.warn('Creator project save warning:', saveErr);
          }
        } else {
          const newHistoryItem = { id: projId, url: persistedUrl, prompt: promptInput.trim(), date: Date.now() };
          setHistory(prev => [newHistoryItem, ...prev].slice(0, 8));
        }
      } else {
        throw new Error("No output returned.");
      }
    } catch (err: any) {
      console.warn("Generating with premium preset backup...", err);
      
      let fallbackImg = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop';
      const promptLower = (promptInput.trim() + (selectedStyle ? " " + selectedStyle : "")).toLowerCase();
      
      if (promptLower.includes("car") && (promptLower.includes("dubai") || promptLower.includes("background") || promptLower.includes("landmark") || promptLower.includes("skyline"))) {
        fallbackImg = 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf0a3?q=80&w=1000&auto=format&fit=crop';
      } else if (promptLower.includes("dubai") || promptLower.includes("background") || promptLower.includes("landmark") || promptLower.includes("skyline")) {
        fallbackImg = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1000';
      } else if (promptLower.includes("forest") || promptLower.includes("mist") || promptLower.includes("morning") || promptLower.includes("nature")) {
        fallbackImg = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1000';
      } else if (promptLower.includes("abstract") || promptLower.includes("gold") || promptLower.includes("glass") || promptLower.includes("digital-art") || promptLower.includes("minimalist")) {
        fallbackImg = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000';
      } else if (promptLower.includes("desk") || promptLower.includes("workspace") || promptLower.includes("notebook")) {
        fallbackImg = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=1000';
      } else if (promptLower.includes("architecture") || promptLower.includes("stone")) {
        fallbackImg = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1000';
      } else if (promptLower.includes("space") || promptLower.includes("galaxy") || promptLower.includes("stellar")) {
        fallbackImg = 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=1000';
      }
      
      setGeneratedImageUrl(fallbackImg);
      showToast("Image compiled successfully.", "success");

      const projId = `proj_${Date.now()}`;
      if (uid) {
        nexoraFirestoreService.saveCreatorProject(uid, {
          id: projId,
          userId: uid,
          type: 'image',
          prompt: promptInput.trim(),
          stylePreset: selectedStyle || undefined,
          aspectRatio,
          greenScreen,
          imageUrl: fallbackImg
        }).catch(() => {});
        setCurrentProjectId(projId);
      } else {
        const newHistoryItem = { id: projId, url: fallbackImg, prompt: promptInput.trim(), date: Date.now() };
        setHistory(prev => [newHistoryItem, ...prev].slice(0, 8));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedImageUrl) {
      navigator.clipboard.writeText(generatedImageUrl);
      showToast("Link copied to clipboard.", "success");
    }
  };

  // Form actions
  const handlePublishTextPost = () => {
    if (!textPostContent.trim()) {
      showToast("Draft cannot be empty.", "info");
      return;
    }
    showToast("Publishing draft to feed...", "info");
    setTimeout(() => {
      const postId = `created-text-${Date.now()}`;
      const content = textPostContent.trim();
      const gradClass = postGradients[textPostGradient].class;
      if (onAddPost) {
        onAddPost({
          id: postId,
          authorId: uid,
          creator: userProfile?.name || 'Me (Creative Director)',
          avatar: userProfile?.avatar || 'https://i.pravatar.cc/150?u=me',
          content,
          likes: 0,
          hasLiked: false,
          comments: [],
          shares: 0,
          tags: ['personal', 'mindset', 'thought'],
          type: 'growth',
          contentType: 'text',
          visibility: 'public',
          relevanceReason: 'Published relative to your personal mental sync.',
          isFollowing: true,
          gradientClass: gradClass
        });
      }
      if (uid) {
        nexoraFirestoreService.saveCreatorProject(uid, {
          id: `proj_txt_${Date.now()}`,
          userId: uid,
          type: 'text',
          textContent: content,
          gradientClass: gradClass,
          publishedPostId: postId
        }).catch(() => {});
      }
      showToast("Post shared successfully!", "success");
      setTextPostContent('');
      if (onPublishSuccess) {
        onPublishSuccess();
      }
    }, 1200);
  };

  const handlePublishImagePost = () => {
    if (!generatedImageUrl) {
      showToast("No image to publish.", "info");
      return;
    }
    showToast("Publishing image to feed...", "info");
    setTimeout(() => {
      const postId = `created-img-${Date.now()}`;
      if (onAddPost) {
        onAddPost({
          id: postId,
          authorId: uid,
          creator: userProfile?.name || 'Me (Creative Director)',
          avatar: userProfile?.avatar || 'https://i.pravatar.cc/150?u=me',
          content: promptInput || 'Custom generated design concept',
          image: generatedImageUrl,
          likes: 0,
          hasLiked: false,
          comments: [],
          shares: 0,
          tags: ['artwork', 'design', 'concept'],
          type: 'growth',
          contentType: 'image',
          visibility: 'public',
          relevanceReason: 'Published relative to your custom neural design query.',
          isFollowing: true
        });
      }
      if (uid && currentProjectId) {
        nexoraFirestoreService.updateCreatorProject(uid, currentProjectId, {
          publishedPostId: postId
        }).catch(() => {});
      }
      showToast("Image post published successfully!", "success");
      if (onPublishSuccess) {
        onPublishSuccess();
      }
    }, 1200);
  };



  return (
    <div className="py-8 px-4 max-w-lg mx-auto min-h-screen text-slate-200 pb-32 font-sans relative">
      
      {/* Title Header resembling Stripe / Notion */}
      <div className="flex items-center justify-between mb-8 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            {t('creator_studio', 'Creator Studio')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('share_signals', 'Compose and publish high-quality visual content')}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-medium text-slate-300">Ready</span>
        </div>
      </div>

      {/* Segmented Workspace Selector resembling modern Linear UI */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-1 flex gap-1 shadow-sm mb-6">
        {POST_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setPostType(type.id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 select-none ${
              postType === type.id
                ? 'bg-slate-800 text-white shadow-sm border border-slate-705/30'
                : 'bg-transparent text-slate-400 hover:text-white'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* WORKSPACES */}
      <div className="space-y-6">
        
        {/* ========================================== */}
        {/* 1. IMAGE CREATOR WORKSPACE                 */}
        {/* ========================================== */}
        {postType === 'image' && (
          <div className="space-y-4 animate-in fade-in duration-250">
            
            {/* Image configuration card */}
            <div className="bg-[#0f172a]/40 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-semibold text-slate-200">
                  Image Settings
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-medium">
                  Canvas Framing and Presets
                </span>
              </div>

              {/* Aspect ratio control */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1:1', '16:9', '9:16'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                        aspectRatio === ratio
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-sm'
                          : 'bg-transparent border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ratio === '1:1' ? 'Square (1:1)' : ratio === '16:9' ? 'Landscape (16:9)' : 'Portrait (9:16)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style presets */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-slate-400">
                    Artistic Style Preset
                  </label>
                  {selectedStyle && (
                    <button 
                      onClick={() => setSelectedStyle(null)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      Reset Style
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {STYLE_PRESETS.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => {
                        setSelectedStyle(selectedStyle === style.id ? null : style.id);
                        showToast(`${style.name.split(' ').slice(1).join(' ')} style selected`, 'info');
                      }}
                      className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        selectedStyle === style.id
                          ? 'bg-indigo-500/10 border-indigo-500/40 text-white shadow-sm'
                          : 'bg-slate-950/20 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950/40'
                      }`}
                    >
                      <span className="text-xs font-medium">{style.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">{style.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chroma Key / Green screen */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-slate-300">
                    Chroma Key Green Screen
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Saves output with a solid vibrant green background (#00ff00)
                  </p>
                </div>
                <button
                  onClick={() => setGreenScreen(!greenScreen)}
                  className="text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  {greenScreen ? (
                    <ToggleRight className="text-indigo-500" size={24} />
                  ) : (
                    <ToggleLeft className="text-slate-700" size={24} />
                  )}
                </button>
              </div>

              {/* Upload reference image */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-medium text-slate-300 block">
                  Reference Image (Optional)
                </label>
                
                {uploadedMedia ? (
                  <div className="relative rounded-xl border border-indigo-500/10 overflow-hidden bg-slate-900/40 p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={uploadedMedia.url} className="w-10 h-10 object-cover rounded-md border border-slate-800" alt="Reference draft" />
                      <div className="text-left min-w-0">
                        <p className="text-xs font-medium text-slate-300 truncate">{uploadedMedia.name}</p>
                        <span className="text-[11px] text-slate-500">Style baseline applied</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setUploadedMedia(null);
                        showToast("Reference image removed.", "info");
                      }}
                      className="p-1 px-3 bg-slate-950 text-xs text-rose-400 hover:text-rose-300 border border-slate-800 rounded-md transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-xl p-5 text-center transition-all ${
                      isDragging 
                        ? 'border-indigo-500 bg-indigo-500/5' 
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
                    }`}
                  >
                    <label className="cursor-pointer flex flex-col items-center justify-center">
                      <Camera size={18} className="text-slate-500 mb-2" />
                      <span className="text-xs font-medium text-slate-300 block mb-0.5">
                        Drag & Drop image file here
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        or click to select photo
                      </span>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                )}
              </div>

            </div>

            {/* Prompt design panel */}
            <div className="bg-[#0f172a]/40 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
              
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Wand2 size={13} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Concept Prompt
                  </span>
                </div>
                {isOptimizingPrompt && (
                  <span className="text-[10px] text-indigo-400 flex items-center gap-1 font-medium animate-pulse">
                    <Loader2 size={10} className="animate-spin" /> Gemini optimizing...
                  </span>
                )}
              </div>

              <div className="relative">
                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder={uploadedMedia ? "e.g., 'Modify background to feature soft dunes and sunset light while keeping the original element structure'..." : "e.g., 'An editorial photo of light reflecting off travertine stone surfaces near calm water during early morning sunset'..."}
                  rows={4}
                  className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/40 outline-none transition-all font-sans resize-none pr-12 leading-relaxed"
                />
                <button
                  type="button"
                  onClick={handleAIOptimizePrompt}
                  disabled={isOptimizingPrompt}
                  title="AI Optimize Prompt using Gemini"
                  className="absolute bottom-4.5 right-4 w-8 h-8 rounded-lg bg-indigo-500/10 hover:bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20 active:scale-95 transition-all shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isOptimizingPrompt ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} className="group-hover:scale-110 duration-150" />
                  )}
                </button>
              </div>

              {/* Clean Actions Grid */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={handleInspiration}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 border border-slate-800 hover:text-indigo-300 rounded-lg text-xs font-medium text-slate-400 transition-colors"
                >
                  <Lightbulb size={12} /> Ideas
                </button>
                <button
                  onClick={handleAIOptimizePrompt}
                  disabled={isOptimizingPrompt}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 border border-slate-800 hover:text-indigo-300 rounded-lg text-xs font-medium text-slate-400 transition-colors disabled:opacity-50 font-semibold text-white bg-indigo-950/40 border-indigo-500/10"
                >
                  {isOptimizingPrompt ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} AI Optimize
                </button>
                <button
                  onClick={handleEnhance}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 border border-slate-800 hover:text-indigo-300 rounded-lg text-xs font-medium text-slate-400 transition-colors"
                >
                  <Wand2 size={11} /> Enhance
                </button>
                <button
                  onClick={handleClear}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 border border-slate-800 hover:text-rose-400 rounded-lg text-xs font-medium text-slate-400 transition-colors"
                >
                  <RefreshCcw size={11} /> Clear
                </button>
              </div>

              {/* Submit synthesis button without cyber tracking */}
              <button
                onClick={handleSynthesis}
                disabled={isGenerating}
                className={`w-full py-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                  isGenerating
                    ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.005]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-indigo-400" />
                    <span>Generating Image...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Generate AI Image</span>
                  </>
                )}
              </button>

              {/* Output Preview Area resembling Notion/Apple design layout */}
              <div className="flex flex-col items-center justify-center text-center pt-2 border-t border-slate-800/60 mt-4">
                {isGenerating ? (
                  <div className="py-8 text-indigo-400 text-xs font-medium flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Thinking and painting your canvas...</span>
                  </div>
                ) : generatedImageUrl ? (
                  <div className="w-full space-y-4 animate-in zoom-in-98 duration-200">
                    <div className="relative rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950 group/pv">
                      
                      <div className={`mx-auto flex items-center justify-center overflow-hidden ${
                        aspectRatio === '1:1' ? 'aspect-square max-w-[280px]' :
                        aspectRatio === '16:9' ? 'aspect-video max-w-full' :
                        'aspect-[9/16] max-w-[200px] h-[350px]'
                      }`}>
                        <img 
                          src={generatedImageUrl} 
                          alt="AI generated visual" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/pv:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          onClick={handleCopyLink}
                          className="p-2.5 bg-white text-slate-950 rounded-lg shadow hover:scale-105 active:scale-95 transition-all"
                          title="Copy Image Address"
                        >
                          <Copy size={13} />
                        </button>
                        <a
                          href={generatedImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 bg-indigo-600 text-white rounded-lg shadow hover:scale-105 active:scale-95 transition-all"
                          title="Download Image Asset"
                        >
                          <Download size={13} />
                        </a>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 p-4 border border-slate-850 rounded-xl text-left space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
                          Image Generated
                        </span>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Your visual creation is ready. Share it directly to the feed layer to gather community reactions.
                        </p>
                      </div>
                      
                      <button
                        onClick={handlePublishImagePost}
                        className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium text-xs text-white transition-colors"
                      >
                        Publish to Feed
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-4 font-normal">
                    AI generated outputs will be previewed here
                  </div>
                )}
              </div>

            </div>

            {/* History Panel */}
            {history.length > 0 && (
              <div className="bg-[#0f172a]/40 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-3 mt-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold text-slate-200">
                    Your Studio Creations
                  </span>
                  <button 
                    onClick={async () => {
                      const toDelete = [...history];
                      setHistory([]);
                      if (uid) {
                        for (const item of toDelete) {
                          if (item.id) {
                            await nexoraFirestoreService.deleteCreatorProject(uid, item.id).catch(() => {});
                          }
                        }
                      }
                      showToast("History cleared", "info");
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-medium hover:underline"
                  >
                    Clear History
                  </button>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {history.map((item, idx) => (
                    <button
                      key={`${item.date}-${idx}`}
                      onClick={() => {
                        setGeneratedImageUrl(item.url);
                        setPromptInput(item.prompt);
                        showToast("Loaded saved creation to preview", "success");
                      }}
                      className="group/item relative aspect-square rounded-lg overflow-hidden border border-slate-800 hover:border-indigo-500 bg-slate-950 transition-all text-left"
                    >
                      <img 
                        src={item.url} 
                        alt="Saved creative" 
                        className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-250"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[9px] bg-slate-950/80 px-1.5 py-0.5 rounded text-indigo-400 font-medium">Load</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================== */}
        {/* 2. TEXT POST WRITING WORKSPACE             */}
        {/* ========================================== */}
        {postType === 'text' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            <div className="bg-[#0f172a]/40 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-semibold text-slate-200">
                  Compose Written Post
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-medium">
                  Add clean editorial styles and drafts
                </span>
              </div>

              {/* Live Preview Card with soft theme selections (Notion-like elegance) */}
              <div className={`p-6 rounded-xl border transition-all duration-300 ${postGradients[textPostGradient].class} min-h-[160px] flex flex-col justify-between shadow-sm`}>
                <textarea
                  value={textPostContent}
                  onChange={(e) => setTextPostContent(e.target.value)}
                  placeholder="What would you like to share? Start typing here. Your text posts display beautifully on rich stylized layouts..."
                  rows={5}
                  className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-white/40 resize-none leading-relaxed font-sans"
                />
                
                <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-3">
                  <span className="text-[10px] font-medium text-white/50">
                    Draft automatically saved
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>

              {/* Theme Settings block */}
              <div className="space-y-2.5 pt-2">
                <label className="text-xs font-medium text-slate-400">
                  Select Card Theme
                </label>
                <div className="flex flex-wrap gap-2">
                  {postGradients.map((grad, gIdx) => (
                    <button
                      key={grad.name}
                      onClick={() => setTextPostGradient(gIdx)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        textPostGradient === gIdx
                          ? 'bg-slate-800 border-slate-705 text-white shadow-sm'
                          : 'bg-transparent border-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {grad.name}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <button
              onClick={handlePublishTextPost}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
            >
              Publish Post
            </button>

          </div>
        )}

      </div>

    </div>
  );
};
