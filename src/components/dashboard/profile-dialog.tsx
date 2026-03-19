"use client";

import { useState, useEffect } from "react";
import { User, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/app/actions/profile";
import { toast } from "sonner";

interface ProfileDialogProps {
  currentName: string;
}

export function ProfileDialog({ currentName }: ProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Fetch current name when dialog opens or on mount
  useEffect(() => {
    if (open) {
      const fetchName = async () => {
        setFetching(true);
        try {
          const supabase = createClient(); // Need to import this or use a prop
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", user.id)
              .single();
            if (data?.display_name) {
              setName(data.display_name);
            }
          }
        } catch (error) {
          console.error("Error fetching name:", error);
        } finally {
          setFetching(false);
        }
      };
      fetchName();
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("display_name", name.trim());

    try {
      const result = await updateProfile(formData);
      if (result.success) {
        toast.success("Profile updated successfully!");
        setOpen(false);
        // Force a page refresh to update greeting if revalidatePath isn't enough for client components
        window.location.reload(); 
      } else {
        toast.error(`Error: ${result.error || "Failed to update profile"}`);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Profile"
          >
            <User className="size-5" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your display name for the dashboard greeting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="font-sans"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
