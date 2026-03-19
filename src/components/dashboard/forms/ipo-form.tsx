"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Rocket, Paperclip } from "lucide-react";
import imageCompression from "browser-image-compression";
import { v4 as uuidv4 } from "uuid";

import { createClient } from "@/utils/supabase/client";
import { addIpoOrder } from "@/app/actions/ipo";
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
  lots_ordered: z.string().min(1, "Lots are required"),
  price_per_share: z.string().min(1, "Price is required"),
  notes: z.string().optional(),
  attachment: z.any().optional(),
});

interface IpoFormProps {
  onSuccess: () => void;
}

export function IpoForm({ onSuccess }: IpoFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ticker: "",
      lots_ordered: "",
      price_per_share: "",
      notes: "",
      attachment: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const rawLots = Number(values.lots_ordered.replace(/[^0-9]/g, ""));
    const rawPrice = Number(values.price_per_share.replace(/[^0-9]/g, ""));

    if (rawLots <= 0 || rawPrice <= 0) {
      form.setError("root", {
        message: "Lots and Price must be greater than 0",
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

        // Convert Lots to Shares internally
        const targetShares = rawLots * 100;

        await addIpoOrder({
          ticker: values.ticker,
          shares_ordered: targetShares,
          price_per_share: rawPrice,
          notes: values.notes,
          attachment_url: attachmentUrl,
        });

        form.reset();
        onSuccess();
      } catch (error) {
        console.error(error);
        form.setError("root", {
          message: error instanceof Error ? error.message : "Failed to log IPO order",
        });
      }
    });
  }

  const formatNumberInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "lots_ordered" | "price_per_share"
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
        <FormField
          control={form.control}
          name="ticker"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ticker</FormLabel>
              <FormControl>
                <Input
                  placeholder="GOTO"
                  {...field}
                  onChange={handleTickerChange}
                  className="bg-background font-mono font-bold uppercase"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="lots_ordered"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ordered (Lots)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="100"
                    {...field}
                    onChange={(e) => formatNumberInput(e, "lots_ordered")}
                    className="bg-background font-mono"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price_per_share"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price / Share (Rp)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="338"
                    {...field}
                    onChange={(e) => formatNumberInput(e, "price_per_share")}
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes / Broker</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="IPO reasoning or broker details..."
                  className="resize-none bg-background h-20"
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
                <Paperclip className="size-3.5" /> Attachment (E-IPO Receipt)
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
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 mt-4"
        >
          {isPending ? "Logging Order..." : <><Rocket className="size-4" /> Place IPO Order</>}
        </button>
      </form>
    </Form>
  );
}
