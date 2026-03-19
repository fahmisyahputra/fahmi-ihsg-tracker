"use client";

import { useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BookOpenCheck, Paperclip } from "lucide-react";
import imageCompression from "browser-image-compression";
import { v4 as uuidv4 } from "uuid";

import { createClient } from "@/utils/supabase/client";
import { addJournalEntry } from "@/app/actions/journal";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").max(10),
  buy_date: z.string().min(1, "Buy Date is required"),
  sell_date: z.string().min(1, "Sell Date is required"),
  buy_price: z.string().min(1, "Buy Price is required"),
  sell_price: z.string().min(1, "Sell Price is required"),
  lots: z.string().min(1, "Lots are required"),
  fee_buy: z.string().optional(),
  fee_sell: z.string().optional(),
  initial_reasoning: z.string().optional(),
  reflection: z.string().optional(),
  trade_type: z.enum(["REGULAR", "IPO"]),
  attachment: z.any().optional(),
});

interface JournalFormProps {
  onSuccess: () => void;
  defaultTicker?: string;
}

export function JournalForm({ onSuccess, defaultTicker = "" }: JournalFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ticker: defaultTicker,
      buy_date: "",
      sell_date: new Date().toISOString().split("T")[0],
      buy_price: "",
      sell_price: "",
      lots: "",
      fee_buy: "0",
      fee_sell: "0",
      initial_reasoning: "",
      reflection: "",
      trade_type: "REGULAR",
      attachment: undefined,
    },
  });

  const watchBuyPrice = form.watch("buy_price");
  const watchSellPrice = form.watch("sell_price");
  const watchLots = form.watch("lots");

  useEffect(() => {
    const buyPrice = Number(watchBuyPrice.replace(/[^0-9]/g, "")) || 0;
    const sellPrice = Number(watchSellPrice.replace(/[^0-9]/g, "")) || 0;
    const lots = Number(watchLots.replace(/[^0-9]/g, "")) || 0;

    if (lots > 0) {
      if (buyPrice > 0) {
        const feeBuy = Math.round(buyPrice * lots * 100 * 0.0015);
        form.setValue("fee_buy", new Intl.NumberFormat("id-ID").format(feeBuy), {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        form.setValue("fee_buy", "0", { shouldValidate: true });
      }

      if (sellPrice > 0) {
        const feeSell = Math.round(sellPrice * lots * 100 * 0.0025);
        form.setValue("fee_sell", new Intl.NumberFormat("id-ID").format(feeSell), {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        form.setValue("fee_sell", "0", { shouldValidate: true });
      }
    } else {
      form.setValue("fee_buy", "0", { shouldValidate: true });
      form.setValue("fee_sell", "0", { shouldValidate: true });
    }
  }, [watchBuyPrice, watchSellPrice, watchLots, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const rawBuyPrice = Number(values.buy_price.replace(/[^0-9]/g, ""));
    const rawSellPrice = Number(values.sell_price.replace(/[^0-9]/g, ""));
    const rawLots = Number(values.lots.replace(/[^0-9]/g, ""));
    const rawFeeBuy = Number(values.fee_buy?.replace(/[^0-9]/g, "") || "0");
    const rawFeeSell = Number(values.fee_sell?.replace(/[^0-9]/g, "") || "0");

    if (rawBuyPrice <= 0 || rawSellPrice <= 0 || rawLots <= 0) {
      form.setError("root", {
        message: "Prices and Lots must be greater than 0",
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

        await addJournalEntry({
          ticker: values.ticker,
          buy_date: values.buy_date,
          sell_date: values.sell_date,
          buy_price: rawBuyPrice,
          sell_price: rawSellPrice,
          lots: rawLots,
          fee_buy: rawFeeBuy,
          fee_sell: rawFeeSell,
          initial_reasoning: values.initial_reasoning,
          reflection: values.reflection,
          trade_type: values.trade_type,
          attachment_url: attachmentUrl,
        });

        form.reset();
        onSuccess();
      } catch (error) {
        console.error(error);
        form.setError("root", {
          message: error instanceof Error ? error.message : "Failed to log entry",
        });
      }
    });
  }

  const formatNumberInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "buy_price" | "sell_price" | "lots" | "fee_buy" | "fee_sell"
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
            name="trade_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trade Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="REGULAR">Regular Trade</SelectItem>
                    <SelectItem value="IPO" className="text-primary font-bold">IPO Flip</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="buy_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Buy Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="bg-background" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sell_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sell Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="bg-background" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="buy_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Buy Price</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="9.000"
                    {...field}
                    onChange={(e) => formatNumberInput(e, "buy_price")}
                    className="bg-background font-mono"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sell_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sell Price</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="9.500"
                    {...field}
                    onChange={(e) => formatNumberInput(e, "sell_price")}
                    className="bg-background font-mono"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="lots"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lots</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="10"
                    {...field}
                    onChange={(e) => formatNumberInput(e, "lots")}
                    className="bg-background font-mono"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fee_buy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Buy Fee</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    {...field}
                    onChange={(e) => formatNumberInput(e, "fee_buy")}
                    className="bg-background font-mono"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fee_sell"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sell Fee</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    {...field}
                    onChange={(e) => formatNumberInput(e, "fee_sell")}
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
          name="initial_reasoning"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Conviction</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Why did you buy this stock?"
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
          name="reflection"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Post-Trade Reflection</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What went well? What went wrong? Lessons learned?"
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
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 mt-4"
        >
          {isPending ? "Saving..." : <><BookOpenCheck className="size-4"/> Log Journal Entry</>}
        </button>
      </form>
    </Form>
  );
}
