"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CheckCircle2 } from "lucide-react";

import { updateIpoStatus } from "@/app/actions/ipo";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  lots_allotted: z.string().min(1, "Required"),
});

interface IpoAllotFormProps {
  orderId: string;
  ticker: string;
  sharesOrdered: number;
  onSuccess: () => void;
}

export function IpoAllotForm({ orderId, ticker, sharesOrdered, onSuccess }: IpoAllotFormProps) {
  const [isPending, startTransition] = useTransition();
  const lotsOrdered = Math.floor(sharesOrdered / 100);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lots_allotted: lotsOrdered.toString(),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const rawLots = Number(values.lots_allotted.replace(/[^0-9]/g, ""));
    const rawShares = rawLots * 100;

    if (rawShares <= 0 || rawShares > sharesOrdered) {
      form.setError("root", {
        message: "Allotted lots must not exceed ordered amount.",
      });
      return;
    }

    startTransition(async () => {
      try {
        await updateIpoStatus(orderId, "ALLOTTED", {
          shares_allotted: rawShares,
          fee_buy: 0,
        });
        onSuccess();
      } catch (error) {
        console.error(error);
        form.setError("root", {
          message: error instanceof Error ? error.message : "Failed to allot",
        });
      }
    });
  }

  const formatNumberInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "lots_allotted"
  ) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      form.setValue(fieldName, "");
      return;
    }
    const num = Number(rawValue);
    form.setValue(fieldName, new Intl.NumberFormat("id-ID").format(num));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          You ordered <strong className="text-foreground">{lotsOrdered} lots</strong> of {ticker}. 
          Enter how many <strong className="text-foreground">lots</strong> you actually received. 
          The remaining locked cash will be automatically refunded, and a BUY transaction (0 fee) will be created.
        </p>
        
        <FormField
          control={form.control}
          name="lots_allotted"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lots Received</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="100"
                  {...field}
                  onChange={(e) => formatNumberInput(e, "lots_allotted")}
                  className="bg-background font-mono"
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
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 mt-4"
        >
          {isPending ? "Processing..." : <><CheckCircle2 className="size-4" /> Confirm Allotment</>}
        </button>
      </form>
    </Form>
  );
}
