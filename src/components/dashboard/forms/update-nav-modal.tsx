"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MutualFund } from "@/lib/dashboard-data";

interface UpdateNavModalProps {
  fund: MutualFund;
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateNavModal({ fund, isOpen, onClose }: UpdateNavModalProps) {
  const [value, setValue] = useState(fund.current_value.toString());
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("mutual_funds")
        .update({
          current_value: parseFloat(value),
          updated_at: new Date().toISOString(),
        })
        .eq("id", fund.id);

      if (error) throw error;

      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error updating NAV:", error);
      alert("Failed to update NAV. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>Update NAV</DrawerTitle>
            <DrawerDescription>
              Update the current value for {fund.fund_name}.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSubmit} className="px-4 py-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_value">Current Market Value (Rp)</Label>
              <Input
                id="current_value"
                type="number"
                placeholder="Enter current value..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground italic">
                Check your investment app (Seed, Bareksa, Bibit) for the latest valuation.
              </p>
            </div>

            <DrawerFooter className="px-0 pt-4">
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
