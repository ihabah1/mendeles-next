"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";

type BlogAdminEditContextValue = {
  canEdit: boolean;
  selectedPostId: string | null;
  selectedPostTitle: string | null;
  selectPost: (postId: string, title: string) => void;
  clearSelection: () => void;
  isSelected: (postId: string) => boolean;
};

const BlogAdminEditContext = createContext<BlogAdminEditContextValue | null>(null);

export function BlogAdminEditProvider({
  children,
  editable = false,
}: {
  children: ReactNode;
  editable?: boolean;
}) {
  const { hasPermission, loading } = useAuth();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostTitle, setSelectedPostTitle] = useState<string | null>(null);

  const canEdit = editable && !loading && hasPermission("content.edit");

  const value = useMemo(
    () => ({
      canEdit,
      selectedPostId,
      selectedPostTitle,
      selectPost: (postId: string, title: string) => {
        setSelectedPostId((current) => {
          if (current === postId) {
            setSelectedPostTitle(null);
            return null;
          }
          setSelectedPostTitle(title);
          return postId;
        });
      },
      clearSelection: () => {
        setSelectedPostId(null);
        setSelectedPostTitle(null);
      },
      isSelected: (postId: string) => selectedPostId === postId,
    }),
    [canEdit, selectedPostId, selectedPostTitle],
  );

  return <BlogAdminEditContext.Provider value={value}>{children}</BlogAdminEditContext.Provider>;
}

export function useBlogAdminEdit() {
  const ctx = useContext(BlogAdminEditContext);
  if (!ctx) {
    return {
      canEdit: false,
      selectedPostId: null,
      selectedPostTitle: null,
      selectPost: () => {},
      clearSelection: () => {},
      isSelected: () => false,
    };
  }
  return ctx;
}
