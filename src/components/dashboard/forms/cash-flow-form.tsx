"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus } from "lucide-react";

import { addCashFlow } from "@/app/actions/portfolio";
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

const formSchema = z.object({
  type: z.enum(["TOPUP", "WITHDRAWAL", "DIVIDEND"]),
  amount: z.string().min(1, "Amount is required"),
  flow_date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
});

interface CashFlowFormProps {
  onSuccess: () => void;
  defaultType?: "TOPUP" | "WITHDRAWAL" | "DIVIDEND";
}

export function CashFlowForm({
  onSuccess,
  defaultType = "TOPUP",
}: CashFlowFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: defaultType,
      amount: "",
      flow_date: new Date().toISOString().split("T")[0],
      description: "",
    },
  });

  const watchAmount = form.watch("amount");

  function onSubmit(values: z.infer<typeof formSchema>) {
    const numericAmount = Number(values.amount.replace(/[^0-9]/g, ""));
    if (numericAmount <= 0) {
      form.setError("amount", { message: "Amount must be greater than 0" });
      return;
    }

    startTransition(async () => {
      try {
        await addCashFlow({
          ...values,
          amount: numericAmount,
        });
        form.reset();
        onSuccess();
      } catch (error) {
        console.error(error);
        form.setError("root", {
          message:
            error instanceof Error ? error.message : "Failed to add cash flow",
        });
      }
    });
  }

  // Helper to format IDR as user types
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      form.setValue("amount", "");
      return;
    }
    // formatIDR adds "Rp", but here we just want the numbers with separators
    const num = Number(rawValue);
    const formatted = new Intl.NumberFormat("id-ID").format(num);
    form.setValue("amount", formatted);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transaction Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="TOPUP">Top-Up (Deposit)</SelectItem>
                  <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                  <SelectItem value="DIVIDEND">Dividend Income</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (Rp)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="10.000.000"
                  {...field}
                  onChange={handleAmountChange}
                  className="bg-background font-mono text-lg font-semibold"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="flow_date"
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

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Monthly deposit"
                  {...field}
                  className="bg-background"
                />
              </FormControl>
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
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? (
            "Saving..."
          ) : (
            <>
              <Plus className="size-4" /> Save Transaction
            </>
          )}
        </button>
      </form>
    </Form>
  );
}
