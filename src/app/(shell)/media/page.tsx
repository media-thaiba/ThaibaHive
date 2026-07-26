"use client";

import React, { useState, useEffect } from "react";
import {
  Folder,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  UploadCloud,
  Search,
  Grid,
  List as ListIcon,
  MoreVertical,
  X,
  Share2,
  Download,
  Trash2,
  FolderPlus,
  ChevronRight,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// --- Mock Data ---
type AssetType = "image" | "video" | "audio" | "document";
type AssetStatus = "ready" | "processing" | "failed";

interface MediaAsset {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType: string;
  fileType: AssetType;
  status: AssetStatus;
  folderId: string | null;
  createdAt: string;
}

interface MediaFolder {
  id: string;
  name: string;
  parentId: string | null;
}

const mockFolders: MediaFolder[] = [
  { id: "root", name: "All Media", parentId: null },
  { id: "f1", name: "Marketing Assets", parentId: "root" },
  { id: "f2", name: "Event Photos", parentId: "f1" },
  { id: "f3", name: "Tutorials", parentId: "root" },
];

const mockAssets: MediaAsset[] = [
  {
    id: "a1",
    name: "hero-banner-2026.png",
    fileUrl: "/placeholder",
    fileSize: 2450000,
    mimeType: "image/png",
    fileType: "image",
    status: "ready",
    folderId: "f1",
    createdAt: new Date().toISOString(),
  },
  {
    id: "a2",
    name: "intro-video-raw.mp4",
    fileUrl: "/placeholder",
    fileSize: 450000000,
    mimeType: "video/mp4",
    fileType: "video",
    status: "processing",
    folderId: "f3",
    createdAt: new Date().toISOString(),
  },
  {
    id: "a3",
    name: "interview-audio.mp3",
    fileUrl: "/placeholder",
    fileSize: 15000000,
    mimeType: "audio/mp3",
    fileType: "audio",
    status: "ready",
    folderId: "root",
    createdAt: new Date().toISOString(),
  },
  {
    id: "a4",
    name: "Q3-Report.pdf",
    fileUrl: "/placeholder",
    fileSize: 1200000,
    mimeType: "application/pdf",
    fileType: "document",
    status: "ready",
    folderId: "root",
    createdAt: new Date().toISOString(),
  }
];

export default function MediaDashboard() {
  const [activeFolder, setActiveFolder] = useState<string>("root");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AssetType | "all">("all");
  const [folders, setFolders] = useState<MediaFolder[]>(mockFolders);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Loading state simulation
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [activeFolder, activeFilter]);

  const currentFolder = folders.find(f => f.id === activeFolder) || folders[0];
  const subFolders = folders.filter(f => f.parentId === activeFolder);
  
  const displayedAssets = mockAssets.filter(asset => {
    const matchesFolder = asset.folderId === activeFolder;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" || asset.fileType === activeFilter;
    return matchesFolder && matchesSearch && matchesFilter;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      // Simulate upload
      setTimeout(() => {
        setIsUploading(false);
        // In a real app, we'd add the file to the list or refresh
      }, 2000);
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setFolders([...folders, { id: "test-" + Date.now(), name: newFolderName, parentId: activeFolder }]);
    setNewFolderName("");
    setIsDialogOpen(false);
  };

  const getFileIcon = (type: AssetType) => {
    switch (type) {
      case "image": return <ImageIcon className="text-blue-500 w-8 h-8" />;
      case "video": return <Film className="text-purple-500 w-8 h-8" />;
      case "audio": return <Music className="text-yellow-500 w-8 h-8" />;
      case "document": return <FileText className="text-gray-500 w-8 h-8" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      
      {/* LEFT PANEL - Navigation & Filters */}
      <div className="w-64 border-r bg-white dark:bg-slate-900 flex flex-col hidden md:flex shrink-0">
        <div className="p-4 border-b flex flex-col gap-2">
          <Button className="w-full flex items-center justify-center gap-2 relative" size="lg">
            <UploadCloud size={18} />
            <span className="font-semibold">Upload Media</span>
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              multiple 
              onChange={handleFileUpload}
            />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button variant="outline" className="w-full flex items-center justify-center gap-2" />}>
              <FolderPlus size={18} />
              <span>New Folder</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreateFolder}>
                <DialogHeader>
                  <DialogTitle>Create Folder</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col space-y-4 mt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="folder-name">Folder Name</Label>
                    <Input id="folder-name" name="name" placeholder="New Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Create</Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Folders</h3>
            <ul className="space-y-1">
              {folders.filter(f => f.id === "root" || f.parentId === "root").map(folder => (
                <li key={folder.id}>
                  <button 
                    onClick={() => setActiveFolder(folder.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${activeFolder === folder.id 
                        ? "bg-primary/10 text-primary" 
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  >
                    <Folder size={16} className={activeFolder === folder.id ? "text-primary" : "text-slate-400"} />
                    <span className="truncate">{folder.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Filters</h3>
            <ul className="space-y-1">
              {[
                { id: "all", icon: <Grid size={16} />, label: "All Types" },
                { id: "image", icon: <ImageIcon size={16} />, label: "Images" },
                { id: "video", icon: <Film size={16} />, label: "Videos" },
                { id: "audio", icon: <Music size={16} />, label: "Audio" },
                { id: "document", icon: <FileText size={16} />, label: "Documents" },
              ].map(filter => (
                <li key={filter.id}>
                  <button 
                    onClick={() => setActiveFilter(filter.id as "all" | "image" | "video" | "audio" | "document")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${activeFilter === filter.id 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                  >
                    {filter.icon}
                    <span>{filter.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950/50">
        
        {/* Header Toolbar */}
        <header className="h-16 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <h1 className="text-slate-400 text-sm font-medium m-0">Media</h1>
            <ChevronRight size={16} className="text-slate-400" />
            <span className="text-slate-900 dark:text-white">{currentFolder.name}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search files..." 
                className="pl-9 bg-slate-100/50 dark:bg-slate-800/50 border-none focus-visible:ring-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
              <button 
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-sm transition-colors ${viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
              >
                <Grid size={16} />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-sm transition-colors ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
              >
                <ListIcon size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Upload Zone & Asset Grid */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative">
          
          {/* Subfolders row */}
          {subFolders.length > 0 && !isLoading && (
            <div className="mb-8">
              <h4 className="text-sm font-medium text-slate-500 mb-4">Folders</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {subFolders.map(folder => (
                  <div 
                    key={folder.id}
                    onClick={() => setActiveFolder(folder.id)}
                    className="group bg-white dark:bg-slate-900 border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="bg-primary/10 text-primary p-2 rounded-md group-hover:scale-110 transition-transform">
                      <Folder size={20} />
                    </div>
                    <span className="font-medium text-sm truncate">{folder.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Grid */}
          <div>
            <h4 className="text-sm font-medium text-slate-500 mb-4">Files</h4>
            
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="flex flex-col gap-2">
                    <Skeleton className="aspect-square w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : displayedAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                <UploadCloud size={48} className="text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No files found</h3>
                <p className="text-sm text-slate-500 mb-4">Drag and drop files here to upload</p>
                <Button variant="outline">Browse Files</Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {displayedAssets.map(asset => (
                  <Card 
                    key={asset.id} 
                    className={`overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary/50 transition-all ${selectedAsset?.id === asset.id ? 'ring-2 ring-primary border-transparent' : ''}`}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className="aspect-square bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center relative p-4">
                      {asset.status === 'processing' ? (
                        <div className="flex flex-col items-center gap-3">
                          <Skeleton className="w-12 h-12 rounded-full animate-pulse" />
                          <span className="text-xs font-medium text-slate-500">Processing...</span>
                        </div>
                      ) : (
                        <div className="transition-transform group-hover:scale-110">
                          {getFileIcon(asset.fileType)}
                        </div>
                      )}
                      
                      {asset.status === 'processing' && (
                        <Badge variant="secondary" className="absolute top-2 right-2 text-[10px]">Processing</Badge>
                      )}
                    </div>
                    <div className="p-3 border-t bg-white dark:bg-slate-900">
                      <p className="text-sm font-medium truncate" title={asset.name}>{asset.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatSize(asset.fileSize)} • {new Date(asset.createdAt).toLocaleDateString()}</p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-lg border overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Size</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayedAssets.map(asset => (
                      <tr 
                        key={asset.id} 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${selectedAsset?.id === asset.id ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                        onClick={() => setSelectedAsset(asset)}
                      >
                        <td className="px-4 py-3 flex items-center gap-3">
                          {getFileIcon(asset.fileType)}
                          <span className="font-medium truncate max-w-[200px]">{asset.name}</span>
                          {asset.status === 'processing' && <Badge variant="secondary" className="ml-2">Processing</Badge>}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatSize(asset.fileSize)}</td>
                        <td className="px-4 py-3 text-slate-500 capitalize">{asset.fileType}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(asset.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                            <MoreVertical size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Uploading Overlay */}
          {isUploading && (
            <div className="absolute bottom-6 right-6 bg-white dark:bg-slate-900 border shadow-lg rounded-lg p-4 w-72 z-20 flex flex-col gap-3 animate-in slide-in-from-bottom-5">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Uploading 1 item...</span>
                <span className="text-xs text-slate-500">45%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[45%] rounded-full transition-all duration-300"></div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* RIGHT PANEL - File Inspector */}
      {selectedAsset && (
        <div className="w-80 border-l bg-white dark:bg-slate-900 flex flex-col shrink-0 animate-in slide-in-from-right-4 z-20 shadow-xl md:shadow-none absolute md:relative right-0 h-full">
          <div className="h-16 border-b flex items-center justify-between px-4 shrink-0">
            <h3 className="font-semibold flex items-center gap-2">
              <Info size={16} className="text-slate-400" />
              File Details
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setSelectedAsset(null)} className="h-8 w-8">
              <X size={16} />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {/* Preview Area */}
            <div className="p-6 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/50 border-b min-h-[200px]">
              {selectedAsset.status === 'processing' ? (
                 <div className="flex flex-col items-center gap-4 text-slate-400">
                   <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
                   <span className="text-sm">Processing Media...</span>
                 </div>
              ) : (
                <div className="w-full flex items-center justify-center">
                  {getFileIcon(selectedAsset.fileType)}
                </div>
              )}
            </div>
            
            <div className="p-5 space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-lg font-semibold truncate mb-1" title={selectedAsset.name}>{selectedAsset.name}</h4>
                <p className="text-sm text-slate-500 flex items-center justify-between">
                  <span>{formatSize(selectedAsset.fileSize)}</span>
                  <span className="uppercase">{selectedAsset.fileType}</span>
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger render={<Button className="flex-1 gap-2" variant="default" />}>
                    <Share2 size={16} /> Share
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Share File</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 mt-4">
                      <div className="grid flex-1 gap-2">
                        <Label htmlFor="link" className="sr-only">
                          Link
                        </Label>
                        <Input
                          id="link"
                          defaultValue={`https://media.thaibahive.com/s/xyz123`}
                          readOnly
                        />
                      </div>
                      <Button type="submit" size="sm" className="px-3">
                        <span className="sr-only">Copy</span>
                        Copy
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button variant="outline" size="icon" className="shrink-0" title="Download">
                  <Download size={16} />
                </Button>
                <Button variant="outline" size="icon" className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete">
                  <Trash2 size={16} />
                </Button>
              </div>
              
              {/* Metadata */}
              <div className="space-y-3 pt-4 border-t">
                <h5 className="text-sm font-semibold text-slate-900 dark:text-white">Properties</h5>
                
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-slate-500">Added</div>
                  <div className="text-right text-slate-900 dark:text-slate-300">{new Date(selectedAsset.createdAt).toLocaleDateString()}</div>
                  
                  <div className="text-slate-500">MIME Type</div>
                  <div className="text-right text-slate-900 dark:text-slate-300 truncate" title={selectedAsset.mimeType}>{selectedAsset.mimeType}</div>
                  
                  {selectedAsset.fileType === 'image' && (
                    <>
                      <div className="text-slate-500">Dimensions</div>
                      <div className="text-right text-slate-900 dark:text-slate-300">1920 × 1080</div>
                      
                      <div className="text-slate-500">Color Space</div>
                      <div className="text-right text-slate-900 dark:text-slate-300">sRGB</div>
                    </>
                  )}
                  
                  {selectedAsset.fileType === 'video' && (
                    <>
                      <div className="text-slate-500">Duration</div>
                      <div className="text-right text-slate-900 dark:text-slate-300">00:02:45</div>
                      
                      <div className="text-slate-500">Resolution</div>
                      <div className="text-right text-slate-900 dark:text-slate-300">4K</div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Tags Section */}
              <div className="pt-4 border-t">
                 <h5 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Tags</h5>
                 <div className="flex flex-wrap gap-2">
                   <Badge variant="secondary">marketing</Badge>
                   <Badge variant="secondary">2026</Badge>
                   <Button variant="outline" size="sm" className="h-6 rounded-full text-xs px-2 py-0 border-dashed">
                     + Add Tag
                   </Button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
