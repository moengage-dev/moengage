// src/components/forms/advertiser-form.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { advertiserSchema } from "@/lib/validators/advertiser.validator";
import type { AdvertiserFormValues } from "@/lib/validators/advertiser.validator";
import { slugify } from "@/lib/slug";
import type { AdvertiserRow } from "@/server/services/advertisers.service";
import type { ActionResult } from "@/app/admin/advertisers/actions";
import { createUnassignedUserAction } from "@/app/admin/users/actions";
import { cn } from "@/lib/utils";

type Props = {
  initialData?: AdvertiserRow;
  unassignedUsers: { id: string; name: string | null; email: string }[];
  onSubmitAction: (values: AdvertiserFormValues) => Promise<ActionResult>;
  onSuccess?: () => void;
};

export function AdvertiserForm({
  initialData,
  unassignedUsers,
  onSubmitAction,
  onSuccess,
}: Props) {
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    !!initialData?.slug
  );

  const [userOptions, setUserOptions] = useState(() => {
    const list = [...unassignedUsers];
    if (
      initialData?.primaryUserId &&
      !list.some((u) => u.id === initialData.primaryUserId)
    ) {
      list.push({
        id: initialData.primaryUserId,
        name: initialData.primaryUserName ?? null,
        email: initialData.primaryUserEmail ?? "",
      });
    }
    return list;
  });

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogName, setDialogName] = useState("");
  const [dialogEmail, setDialogEmail] = useState("");
  const [dialogPassword, setDialogPassword] = useState("");
  const [dialogLoading, setDialogLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AdvertiserFormValues>({
    resolver: zodResolver(advertiserSchema) as Resolver<AdvertiserFormValues>,
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      industry: initialData?.industry ?? "",
      websiteUrl: initialData?.websiteUrl ?? "",
      logoUrl: initialData?.logoUrl ?? "",

      status:
        (initialData?.status as AdvertiserFormValues["status"]) ?? "ACTIVE",
      primaryUserId: initialData?.primaryUserId ?? "",
    },
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (!slugManuallyEdited && !initialData) {
      setValue("slug", slugify(nameValue ?? ""));
    }
  }, [nameValue, slugManuallyEdited, initialData, setValue]);

  const onSubmit = async (values: AdvertiserFormValues) => {
    const result = await onSubmitAction(values);
    if (result.ok) {
      toast.success(result.message);
      onSuccess?.();
    } else {
      toast.error(result.error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogLoading(true);
    try {
      const res = await createUnassignedUserAction({
        name: dialogName,
        email: dialogEmail,
        password: dialogPassword,
        role: "ADVERTISER_VIEWER",
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to create user");
      } else if (res.user) {
        toast.success(res.message);
        const newUser = {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
        };
        setUserOptions((prev) => [...prev, newUser]);
        setValue("primaryUserId", newUser.id);
        setDialogName("");
        setDialogEmail("");
        setDialogPassword("");
        setDialogOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setDialogLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="adv-name">
          Name <span className="text-destructive">*</span>
        </label>
        <Input id="adv-name" {...register("name")} placeholder="Vodacom" />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="adv-slug">
          Slug <span className="text-destructive">*</span>
        </label>
        <Input
          id="adv-slug"
          {...register("slug", {
            onChange: () => setSlugManuallyEdited(true),
          })}
          placeholder="vodacom"
          className="font-mono"
        />
        {errors.slug && (
          <p className="text-xs text-destructive">{errors.slug.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="adv-industry">
          Industry
        </label>
        <Input
          id="adv-industry"
          {...register("industry")}
          placeholder="Telecom"
        />
      </div>



      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="adv-websiteUrl">
          Website URL
        </label>
        <Input
          id="adv-websiteUrl"
          {...register("websiteUrl")}
          placeholder="https://vodacom.com"
        />
        {errors.websiteUrl && (
          <p className="text-xs text-destructive">{errors.websiteUrl.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between w-full mb-2">
          <label className="text-sm font-medium">Primary Contact / Account Manager</label>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="text-xs font-medium border-brand-coral/30 hover:border-brand-coral text-brand-coral bg-brand-coral/[0.04] hover:bg-brand-coral/[0.08] rounded-full px-3 h-7 transition-colors"
              >
                <Plus className="mr-1 h-3 w-3 shrink-0" />
                New User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Account Manager Account</DialogTitle>
                <DialogDescription>
                  Create a new platform user with the CAMPAIGN_MANAGER role.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="new-mgr-name">
                    Name
                  </label>
                  <Input
                    id="new-mgr-name"
                    value={dialogName}
                    onChange={(e) => setDialogName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="new-mgr-email">
                    Email
                  </label>
                  <Input
                    id="new-mgr-email"
                    type="email"
                    value={dialogEmail}
                    onChange={(e) => setDialogEmail(e.target.value)}
                    placeholder="jane.smith@advertiser.com"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="new-mgr-password">
                    Password
                  </label>
                  <Input
                    id="new-mgr-password"
                    type="password"
                    value={dialogPassword}
                    onChange={(e) => setDialogPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={dialogLoading}>
                    {dialogLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Controller
          name="primaryUserId"
          control={control}
          render={({ field }) => (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between font-normal text-left"
                >
                  {field.value
                    ? userOptions.find((u) => u.id === field.value)?.name ||
                      userOptions.find((u) => u.id === field.value)?.email ||
                      "Selected User"
                    : "Select a user..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search user..." />
                  <CommandList>
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          field.onChange("");
                          setPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !field.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        None (Unassigned)
                      </CommandItem>
                      {userOptions.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={`${u.name || ""} ${u.email}`.trim().toLowerCase()}
                          onSelect={() => {
                            field.onChange(u.id);
                            setPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value === u.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{u.name || "Unnamed"}</span>
                            <span className="text-xs text-muted-foreground">{u.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="adv-status">
          Status <span className="text-destructive">*</span>
        </label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="adv-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.status && (
          <p className="text-xs text-destructive">{errors.status.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? "Save Changes" : "Create Advertiser"}
      </Button>
    </form>
  );
}
