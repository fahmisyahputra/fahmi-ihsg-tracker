"use client";

import { useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus } from "lucide-react";

import { addTransaction } from "@/app/actions/portfolio";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatIDR } from "@/lib/twr";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  type: z.enum(["BUY", "SELL"]),
  ticker: z.string().min(1, "Ticker is required").max(10),
  price: z.string().min(1, "Price is required"),
  lots: z.string().min(1, "Lots are required"),
  fee: z.string().optional(),
  transaction_date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

interface TradeFormProps {
  onSuccess: () => void;
  defaultType?: "BUY" | "SELL";
  defaultTicker?: string;
}

export function TradeForm({ onSuccess, defaultType = "BUY", defaultTicker = "" }: TradeFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: defaultType,
      ticker: defaultTicker,
      price: "",
      lots: "",
      fee: "0",
      transaction_date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const watchPrice = form.watch("price");
  const watchLots = form.watch("lots");
  const watchType = form.watch("type");

  const numericPrice = Number(watchPrice.replace(/[^0-9]/g, "")) || 0;
  const numericLots = Number(watchLots.replace(/[^0-9]/g, "")) || 0;
  // 1 lot = 100 shares in IDX
  const grossValue = numericPrice * numericLots * 100;

  // Auto-calculate Broker Fee
  useEffect(() => {
    if (grossValue > 0) {
      // Standard broker fees: 0.15% for Buy, 0.25% for Sell
      const feeRate = watchType === "BUY" ? 0.0015 : 0.0025;
      const calculatedFee = Math.round(grossValue * feeRate);
      form.setValue("fee", new Intl.NumberFormat("id-ID").format(calculatedFee), {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      form.setValue("fee", "0", { shouldValidate: true });
    }
  }, [grossValue, watchType, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const rawPrice = Number(values.price.replace(/[^0-9]/g, ""));
    const rawLots = Number(values.lots.replace(/[^0-9]/g, ""));
    const rawFee = Number(values.fee?.replace(/[^0-9]/g, "") || "0");

    if (rawPrice <= 0 || rawLots <= 0) {
      form.setError("root", {
        message: "Price and Lots must be greater than 0",
      });
      return;
    }

    startTransition(async () => {
      try {
        await addTransaction({
          ...values,
          price: rawPrice,
          lots: rawLots,
          fee: rawFee,
        });
        form.reset();
        onSuccess();
      } catch (error) {
        console.error(error);
        form.setError("root", {
          message: error instanceof Error ? error.message : "Failed to add trade",
        });
      }
    });
  }

  // Format helpers for inputs
  const formatNumberInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "price" | "lots" | "fee"
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Type & Ticker Row */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BUY" className="text-profit">
                      Buy
                    </SelectItem>
                    <SelectItem value="SELL" className="text-loss">
                      Sell
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
        </div>

        {/* Price & Lots Row */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (Rp)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="9.500"
                    {...field}
                    onChange={(e) => formatNumberInput(e, "price")}
                    className="bg-background font-mono"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lots"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lots (1=100)</FormLabel>
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
        </div>

        <FormField
          control={form.control}
          name="fee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Broker Fee (Auto {watchType === "BUY" ? "0.15%" : "0.25%"} - Editable)
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  {...field}
                  onChange={(e) => formatNumberInput(e, "fee")}
                  className="bg-background font-mono text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="transaction_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} className="bg-background" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {grossValue > 0 && (
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Gross Transaction Value
              </span>
              <span
                className={cn(
                  "font-mono text-sm font-bold",
                  watchType === "BUY" ? "text-loss" : "text-profit"
                )}
              >
                {watchType === "BUY" ? "-" : "+"}
                {formatIDR(grossValue)}
              </span>
            </div>
          </div>
        )}

        {form.formState.errors.root && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? (
            "Saving..."
          ) : (
            <>
              <Plus className="size-4" /> Save Trade
            </>
          )}
        </button>
      </form>
    </Form>
  );
}
