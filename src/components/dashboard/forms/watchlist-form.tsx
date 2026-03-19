"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Paperclip } from "lucide-react";
import imageCompression from "browser-image-compression";
import { v4 as uuidv4 } from "uuid";

import { createClient } from "@/utils/supabase/client";
import { addWatchlistItem } from "@/app/actions/journal";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").max(10),
  target_buy_price: z.string().min(1, "Target Price is required"),
  reasoning: z.string().min(1, "Reasoning is required"),
  attachment: z.any().optional(),
});

interface WatchlistFormProps {
  onSuccess: () => void;
}

export function WatchlistForm({ onSuccess }: WatchlistFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ticker: "",
      target_buy_price: "",
      reasoning: "",
      attachment: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const rawPrice = Number(values.target_buy_price.replace(/[^0-9]/g, ""));

    if (rawPrice <= 0) {
      form.setError("root", {
        message: "Target price must be greater than 0",
      });
      return;
    }

    startTransition(async () => {
      try {
        let attachmentUrl = undefined;
        const fileList = values.attachment as FileList;

        if (fileList && fileList.length > 0) {
          let file = fileList[0];

          if (file.size > 2 * 1024 * 1024) {
            throw new Error("Attachment size must be strictly less than 2MB.");
          }

          if (file.type.startsWith("image/")) {
            file = await imageCompression(file, {
              maxSizeMB: 0.5,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            });
          }

          const supabase = createClient();
          const fileExt = file.name.split(".").pop();
          const fileName = `${uuidv4()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("attachments")
            .upload(fileName, file, { cacheControl: "3600", upsert: false });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          const { data } = supabase.storage
            .from("attachments")
            .getPublicUrl(fileName);
          attachmentUrl = data.publicUrl;
        }

        await addWatchlistItem({
          ticker: values.ticker,
          target_buy_price: rawPrice,
          reasoning: values.reasoning,
          attachment_url: attachmentUrl,
        });

        form.reset();
        onSuccess();
      } catch (error) {
        console.error(error);
        form.setError("root", {
          message: error instanceof Error ? error.message : "Failed to add item",
        });
      }
    });
  }

  const formatNumberInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "target_buy_price"
  ) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      form.setValue(fieldName, "");
      return;
    }
    const num = Number(rawValue);
    form.setValue(fieldName, new Intl.NumberFormat("id-ID").format(num));
  };

  const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue("ticker", e.target.value.toUpperCase());
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="ticker"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ticker</FormLabel>
                <FormControl>
                  <Input
                    placeholder="BBCA"
                    {...field}
                    onChange={handleTickerChange}
                    className="bg-background font-mono font-bold uppercase"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="target_buy_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Price (Rp)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="9.500"
                    {...field}
                    onChange={(e) => formatNumberInput(e, "target_buy_price")}
                    className="bg-background font-mono"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reasoning"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conviction / Reasoning</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Why are you watching this stock?"
                  className="resize-none bg-background h-24"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="attachment"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Paperclip className="size-3.5" /> Attachment (Optional)
              </FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  className="bg-background text-xs file:text-xs file:font-semibold cursor-pointer"
                  onChange={(event) => {
                    onChange(event.target.files);
                  }}
                  {...fieldProps}
                />
              </FormControl>
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                Max size: 2MB (Images auto-compressed)
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 mt-2"
        >
          {isPending ? "Adding..." : "Add to Watchlist"}
        </button>
      </form>
    </Form>
  );
}
