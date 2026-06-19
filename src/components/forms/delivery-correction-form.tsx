"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { correctDeliveryScan } from "@/app/admin/delivery/actions";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { DeliveryScanDTO, RetailerDTO } from "@/lib/dtos/delivery.dto";

const optionalString = z.union([z.string(), z.null()]).optional().transform(v => v === "" ? null : v);

const formSchema = z.object({
  id: z.string(),
  retailerId: optionalString,
  cartonsDelivered: z.coerce.number().int().positive().max(100000),
  notes: optionalString,
  correctionReason: z.string().min(5, "A reason is required to perform a correction"),
  country: optionalString,
  region: optionalString,
  city: optionalString,
  suburb: optionalString,
  latitude: z.union([z.string(), z.number(), z.null()]).optional().transform(val => (val === "" || val == null ? null : Number(val))),
  longitude: z.union([z.string(), z.number(), z.null()]).optional().transform(val => (val === "" || val == null ? null : Number(val))),
});

type FormValues = z.infer<typeof formSchema>;
type FormInput = z.input<typeof formSchema>;

export function DeliveryCorrectionSheet({
  scan,
  retailers,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  scan: DeliveryScanDTO;
  retailers: RetailerDTO[];
  /** When provided the Sheet is controlled externally; no trigger button is rendered. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<
    FormInput,
    unknown,
    FormValues
  >({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: scan.id,
      retailerId: scan.retailerId ?? null,
      cartonsDelivered: scan.cartonsDelivered,
      notes: scan.notes ?? null,
      correctionReason: "",
      country: scan.country ?? null,
      region: scan.region ?? null,
      city: scan.city ?? null,
      suburb: scan.suburb ?? null,
      latitude: scan.latitude ? Number(scan.latitude) : null,
      longitude: scan.longitude ? Number(scan.longitude) : null,
    }
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const payload = {
        id: data.id,
        retailerId: data.retailerId ?? null,
        cartonsDelivered: data.cartonsDelivered,
        notes: data.notes ?? null,
        correctionReason: data.correctionReason,
        country: data.country ?? null,
        region: data.region ?? null,
        city: data.city ?? null,
        suburb: data.suburb ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      };
      
      const res = await correctDeliveryScan(payload);
      // Handle reset payload matching FormInput
      if (res.ok) {
        toast.success("Delivery Corrected", { description: "Audit log recorded and values updated." });
        setOpen(false);
        reset({ ...data, correctionReason: "" });
      } else {
        toast.error("Correction Failed", { description: res.error });
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </SheetTrigger>
      )}
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Correct Delivery Scan</SheetTitle>
          <SheetDescription>
            Modify this delivery record. All corrections are logged with an audit trail.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg border text-xs space-y-1.5 font-mono">
            <div className="font-semibold text-foreground border-b pb-1 mb-2 font-sans">Immutable Details</div>
            <div><span className="text-muted-foreground">ID:</span> {scan.id}</div>
            <div><span className="text-muted-foreground">QR Code:</span> {scan.qrCode?.code}</div>
            <div><span className="text-muted-foreground">Batch:</span> {scan.batch?.batchCode}</div>
            <div><span className="text-muted-foreground">Brand:</span> {scan.brand?.name}</div>
            <div><span className="text-muted-foreground">Campaign:</span> {scan.campaign?.name}</div>
            <div><span className="text-muted-foreground">Product:</span> {scan.qrCode?.product?.name}</div>
            <div><span className="text-muted-foreground">Units/Carton:</span> {scan.unitsPerCarton}</div>
            <div><span className="text-muted-foreground">Created:</span> {new Date(scan.createdAt).toLocaleString()}</div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("id")} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Retailer / Outlet</label>
              <Controller
                name="retailerId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || "none"} onValueChange={(val) => field.onChange(val === "none" ? null : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select retailer..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Retailer (Manual Location)</SelectItem>
                      {retailers.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cartons Delivered</label>
              <Input type="number" {...register("cartonsDelivered")} />
              {errors.cartonsDelivered && <p className="text-xs text-destructive">{errors.cartonsDelivered.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Country</label>
                <Input {...register("country")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Region</label>
                <Input {...register("region")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">City</label>
                <Input {...register("city")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Suburb</label>
                <Input {...register("suburb")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Latitude</label>
                <Input type="number" step="any" {...register("latitude")} />
                {errors.latitude && <p className="text-xs text-destructive">{errors.latitude.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Longitude</label>
                <Input type="number" step="any" {...register("longitude")} />
                {errors.longitude && <p className="text-xs text-destructive">{errors.longitude.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea {...register("notes")} />
            </div>

            <div className="space-y-1.5 border-t pt-4">
              <label className="text-sm font-medium text-destructive">Correction Reason *</label>
              <Textarea placeholder="Required audit reason for this change..." {...register("correctionReason")} />
              {errors.correctionReason && <p className="text-xs text-destructive">{errors.correctionReason.message}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>Save Correction</Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
