// src/lib/dtos/delivery.dto.ts

export type CampaignDTO = {
  id: string;
  name: string;
  brandId: string;
  advertiserId: string;
  fixedFeePerUnit: number | null;
  engagementFeePerScan: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
};

export type RetailerDTO = {
  id: string;
  name: string;
  brandId: string | null;
  type: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  suburb: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type DeliveryScanDTO = {
  id: string;
  qrCodeId: string;
  brandId: string | null;
  campaignId: string | null;
  batchId: string | null;
  retailerId: string | null;
  scannedByUserId: string | null;
  cartonsDelivered: number;
  unitsPerCarton: number;
  estimatedUnitsDelivered: number;
  country: string | null;
  region: string | null;
  city: string | null;
  suburb: string | null;
  latitude: number | null;
  longitude: number | null;
  locationSource: string;
  notes: string | null;
  createdAt: string;
  brand: { id: string; name: string } | null;
  retailer: RetailerDTO | null;
  campaign: CampaignDTO | null;
  batch: { id: string; batchCode: string } | null;
  qrCode: {
    id: string;
    code: string;
    product: { id: string; name: string } | null;
  } | null;
};

export type RetailerOptionDTO = {
  id: string;
  name: string;
  brandId: string | null;
};

export type CampaignOptionDTO = {
  id: string;
  name: string;
  brandId: string;
  advertiserId: string;
  productId: string | null;
};

function convertDecimal(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val);
  if (typeof val === "object" && typeof val.toNumber === "function") {
    return val.toNumber();
  }
  return Number(val);
}

export function toDeliveryScanDTO(scan: any): DeliveryScanDTO {
  return {
    id: scan.id,
    qrCodeId: scan.qrCodeId,
    brandId: scan.brandId,
    campaignId: scan.campaignId,
    batchId: scan.batchId,
    retailerId: scan.retailerId,
    scannedByUserId: scan.scannedByUserId,
    cartonsDelivered: scan.cartonsDelivered,
    unitsPerCarton: scan.unitsPerCarton,
    estimatedUnitsDelivered: scan.estimatedUnitsDelivered,
    country: scan.country,
    region: scan.region,
    city: scan.city,
    suburb: scan.suburb,
    latitude: convertDecimal(scan.latitude),
    longitude: convertDecimal(scan.longitude),
    locationSource: scan.locationSource,
    notes: scan.notes,
    createdAt: scan.createdAt instanceof Date ? scan.createdAt.toISOString() : new Date(scan.createdAt).toISOString(),
    brand: scan.brand ? { id: scan.brand.id, name: scan.brand.name } : null,
    retailer: scan.retailer ? toRetailerDTO(scan.retailer) : null,
    campaign: scan.campaign ? toCampaignDTO(scan.campaign) : null,
    batch: scan.batch ? { id: scan.batch.id, batchCode: scan.batch.batchCode } : null,
    qrCode: scan.qrCode ? {
      id: scan.qrCode.id,
      code: scan.qrCode.code,
      product: scan.qrCode.product ? { id: scan.qrCode.product.id, name: scan.qrCode.product.name } : null,
    } : null,
  };
}

export function toRetailerDTO(retailer: any): RetailerDTO {
  return {
    id: retailer.id,
    name: retailer.name,
    brandId: retailer.brandId,
    type: retailer.type,
    country: retailer.country,
    region: retailer.region,
    city: retailer.city,
    suburb: retailer.suburb,
    latitude: convertDecimal(retailer.latitude),
    longitude: convertDecimal(retailer.longitude),
  };
}

export function toCampaignDTO(campaign: any): CampaignDTO {
  return {
    id: campaign.id,
    name: campaign.name,
    brandId: campaign.brandId,
    advertiserId: campaign.advertiserId,
    fixedFeePerUnit: convertDecimal(campaign.fixedFeePerUnit),
    engagementFeePerScan: convertDecimal(campaign.engagementFeePerScan),
    currency: campaign.currency,
    startDate: campaign.startDate ? (campaign.startDate instanceof Date ? campaign.startDate.toISOString() : new Date(campaign.startDate).toISOString()) : null,
    endDate: campaign.endDate ? (campaign.endDate instanceof Date ? campaign.endDate.toISOString() : new Date(campaign.endDate).toISOString()) : null,
  };
}

export function toRetailerOptionDTO(retailer: any): RetailerOptionDTO {
  return {
    id: retailer.id,
    name: retailer.name,
    brandId: retailer.brandId,
  };
}

export function toCampaignOptionDTO(campaign: any): CampaignOptionDTO {
  return {
    id: campaign.id,
    name: campaign.name,
    brandId: campaign.brandId,
    advertiserId: campaign.advertiserId,
    productId: campaign.productId ?? null,
  };
}
