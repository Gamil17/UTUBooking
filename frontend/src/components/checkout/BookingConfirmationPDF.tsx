/**
 * BookingConfirmationPDF — SERVER ONLY. Do NOT import with 'use client'.
 *
 * Multi-locale booking confirmation rendered with @react-pdf/renderer v4.
 * Fonts loaded from @fontsource packages already installed in node_modules.
 *
 * Urdu (ur):  Noto Nastaliq Urdu — Nastaliq script, line-height ×2.2
 * Arabic (ar): Noto Sans Arabic
 * Hindi (hi):  Noto Sans Devanagari
 * Farsi (fa):  Vazirmatn
 * Latin (en/fr/tr/id/ms): Inter
 */

import path from 'path';
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from '@react-pdf/renderer';

// ── Font paths from @fontsource packages ─────────────────────────────────────
// React-PDF accepts absolute filesystem paths on the server.
const fontsDir = (pkg: string) =>
  path.join(process.cwd(), 'node_modules', '@fontsource', pkg, 'files');

Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(fontsDir('inter'), 'inter-latin-400-normal.woff') },
    { src: path.join(fontsDir('inter'), 'inter-latin-700-normal.woff'), fontWeight: 700 },
  ],
});

Font.register({
  family: 'Noto Sans Arabic',
  fonts: [
    { src: path.join(fontsDir('noto-sans-arabic'), 'noto-sans-arabic-arabic-400-normal.woff') },
    { src: path.join(fontsDir('noto-sans-arabic'), 'noto-sans-arabic-arabic-600-normal.woff'), fontWeight: 600 },
  ],
});

// Urdu Nastaliq — CRITICAL: 'arabic' subset in @fontsource contains the Urdu
// Unicode block; do NOT use 'urdu' (that subset doesn't exist in this package).
Font.register({
  family: 'Noto Nastaliq Urdu',
  fonts: [
    { src: path.join(fontsDir('noto-nastaliq-urdu'), 'noto-nastaliq-urdu-arabic-400-normal.woff') },
  ],
});

Font.register({
  family: 'Noto Sans Devanagari',
  fonts: [
    { src: path.join(fontsDir('noto-sans-devanagari'), 'noto-sans-devanagari-devanagari-400-normal.woff') },
  ],
});

Font.register({
  family: 'Vazirmatn',
  fonts: [
    { src: path.join(fontsDir('vazirmatn'), 'vazirmatn-arabic-400-normal.woff') },
  ],
});

// ── Locale → font mapping ─────────────────────────────────────────────────────
function fontForLocale(locale: string): string {
  switch (locale) {
    case 'ar':  return 'Noto Sans Arabic';
    case 'ur':  return 'Noto Nastaliq Urdu';
    case 'hi':  return 'Noto Sans Devanagari';
    case 'fa':  return 'Vazirmatn';
    default:    return 'Inter';
  }
}

// ── Translations ──────────────────────────────────────────────────────────────
interface PDFLabels {
  title: string;
  refLabel: string;
  guestLabel: string;
  hotelLabel: string;
  checkInLabel: string;
  checkOutLabel: string;
  nightsLabel: string;
  totalLabel: string;
  statusLabel: string;
  statusValue: string;
  thankYou: string;
  poweredBy: string;
}

const LABELS: Record<string, PDFLabels> = {
  en: {
    title: 'Booking Confirmation',
    refLabel: 'Booking Reference',
    guestLabel: 'Guest Name',
    hotelLabel: 'Hotel',
    checkInLabel: 'Check-in',
    checkOutLabel: 'Check-out',
    nightsLabel: 'Nights',
    totalLabel: 'Total Amount',
    statusLabel: 'Status',
    statusValue: 'Confirmed',
    thankYou: 'Thank you for choosing UTUBooking for your Hajj & Umrah journey.',
    poweredBy: 'UTUBooking.com — AMEC Solutions',
  },
  ar: {
    title: 'تأكيد الحجز',
    refLabel: 'رقم الحجز',
    guestLabel: 'اسم الضيف',
    hotelLabel: 'الفندق',
    checkInLabel: 'تاريخ الوصول',
    checkOutLabel: 'تاريخ المغادرة',
    nightsLabel: 'الليالي',
    totalLabel: 'المبلغ الإجمالي',
    statusLabel: 'الحالة',
    statusValue: 'مؤكد',
    thankYou: 'شكراً لاختيارك UTUBooking لرحلة حجك وعمرتك.',
    poweredBy: 'UTUBooking.com — AMEC Solutions',
  },
  ur: {
    title: 'بکنگ تصدیق',
    refLabel: 'بکنگ حوالہ',
    guestLabel: 'مہمان کا نام',
    hotelLabel: 'ہوٹل',
    checkInLabel: 'چیک ان',
    checkOutLabel: 'چیک آؤٹ',
    nightsLabel: 'راتیں',
    totalLabel: 'کل رقم',
    statusLabel: 'حیثیت',
    statusValue: 'تصدیق شدہ',
    thankYou: 'اپنے حج اور عمرہ سفر کے لیے UTUBooking کا انتخاب کرنے کا شکریہ۔',
    poweredBy: 'UTUBooking.com — AMEC Solutions',
  },
  tr: {
    title: 'Rezervasyon Onayı',
    refLabel: 'Rezervasyon No',
    guestLabel: 'Misafir Adı',
    hotelLabel: 'Otel',
    checkInLabel: 'Giriş Tarihi',
    checkOutLabel: 'Çıkış Tarihi',
    nightsLabel: 'Gece',
    totalLabel: 'Toplam Tutar',
    statusLabel: 'Durum',
    statusValue: 'Onaylandı',
    thankYou: "Hac ve Umre yolculuğunuz için UTUBooking'i seçtiğiniz için teşekkürler.",
    poweredBy: 'UTUBooking.com — AMEC Solutions',
  },
  id: {
    title: 'Konfirmasi Pemesanan',
    refLabel: 'Nomor Pemesanan',
    guestLabel: 'Nama Tamu',
    hotelLabel: 'Hotel',
    checkInLabel: 'Check-in',
    checkOutLabel: 'Check-out',
    nightsLabel: 'Malam',
    totalLabel: 'Total Biaya',
    statusLabel: 'Status',
    statusValue: 'Dikonfirmasi',
    thankYou: 'Terima kasih telah memilih UTUBooking untuk perjalanan Haji & Umrah Anda.',
    poweredBy: 'UTUBooking.com — AMEC Solutions',
  },
  ms: {
    title: 'Pengesahan Tempahan',
    refLabel: 'No. Tempahan',
    guestLabel: 'Nama Tetamu',
    hotelLabel: 'Hotel',
    checkInLabel: 'Daftar Masuk',
    checkOutLabel: 'Daftar Keluar',
    nightsLabel: 'Malam',
    totalLabel: 'Jumlah Bayaran',
    statusLabel: 'Status',
    statusValue: 'Disahkan',
    thankYou: 'Terima kasih kerana memilih UTUBooking untuk perjalanan Haji & Umrah anda.',
    poweredBy: 'UTUBooking.com — AMEC Solutions',
  },
  fr: {
    title: 'Confirmation de Réservation',
    refLabel: 'Référence',
    guestLabel: 'Nom du Client',
    hotelLabel: 'Hôtel',
    checkInLabel: 'Arrivée',
    checkOutLabel: 'Départ',
    nightsLabel: 'Nuits',
    totalLabel: 'Montant Total',
    statusLabel: 'Statut',
    statusValue: 'Confirmé',
    thankYou: "Merci d'avoir choisi UTUBooking pour votre voyage de Hajj et Umrah.",
    poweredBy: 'UTUBooking.com — AMEC Solutions',
  },
};

function getLabels(locale: string): PDFLabels {
  return LABELS[locale] ?? LABELS.en;
}

// ── Booking data ──────────────────────────────────────────────────────────────
export interface BookingConfirmationData {
  bookingRef: string;
  guestName: string;
  hotelName: string;
  checkIn: string;     // yyyy-MM-dd
  checkOut: string;    // yyyy-MM-dd
  nights: number;
  totalAmount: string; // pre-formatted, e.g. "SAR 1,200" or "PKR 45,000"
  locale: string;
}

// ── Styles ────────────────────────────────────────────────────────────────────
function makeStyles(font: string, isRTL: boolean) {
  const isNastaliq = font === 'Noto Nastaliq Urdu';
  const textLH = isNastaliq ? 2.2 : 1.4;
  const headLH = isNastaliq ? 2.5 : 1.3;

  return StyleSheet.create({
    page: {
      fontFamily: font,
      padding: 40,
      backgroundColor: '#FFFFFF',
    },
    header: {
      backgroundColor: '#065F46',
      borderRadius: 12,
      padding: 24,
      marginBottom: 24,
    },
    headerTitle: {
      fontFamily: font,
      fontSize: 22,
      fontWeight: 700,
      color: '#FFFFFF',
      textAlign: isRTL ? 'right' : 'left',
      lineHeight: headLH,
    },
    headerRef: {
      fontFamily: font,
      fontSize: 11,
      color: '#A7F3D0',
      textAlign: isRTL ? 'right' : 'left',
      marginTop: 4,
      lineHeight: textLH,
    },
    statusBadge: {
      backgroundColor: '#D1FAE5',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
      alignSelf: isRTL ? 'flex-end' : 'flex-start',
      marginTop: 8,
    },
    statusText: {
      fontFamily: font,
      fontSize: 10,
      color: '#065F46',
      fontWeight: 600,
      lineHeight: textLH,
    },
    row: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    rowLabel: {
      fontFamily: font,
      fontSize: 10,
      color: '#6B7280',
      textAlign: isRTL ? 'right' : 'left',
      lineHeight: textLH,
    },
    rowValue: {
      fontFamily: font,
      fontSize: 11,
      color: '#111827',
      fontWeight: 600,
      textAlign: isRTL ? 'left' : 'right',
      lineHeight: textLH,
    },
    totalRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      backgroundColor: '#F0FDF4',
      borderRadius: 8,
      paddingHorizontal: 12,
      marginTop: 8,
    },
    totalLabel: {
      fontFamily: font,
      fontSize: 12,
      color: '#065F46',
      fontWeight: 700,
      textAlign: isRTL ? 'right' : 'left',
      lineHeight: textLH,
    },
    totalValue: {
      fontFamily: font,
      fontSize: 14,
      color: '#065F46',
      fontWeight: 700,
      textAlign: isRTL ? 'left' : 'right',
      lineHeight: textLH,
    },
    footer: {
      marginTop: 32,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    },
    thankYou: {
      fontFamily: font,
      fontSize: 11,
      color: '#374151',
      textAlign: 'center',
      marginBottom: 8,
      lineHeight: textLH,
    },
    footerText: {
      fontFamily: font,
      fontSize: 9,
      color: '#9CA3AF',
      textAlign: 'center',
      lineHeight: textLH,
    },
  });
}

// ── PDF Document component ────────────────────────────────────────────────────
function BookingDocument({ data }: { data: BookingConfirmationData }) {
  const locale = data.locale ?? 'en';
  const labels = getLabels(locale);
  const font   = fontForLocale(locale);
  const isRTL  = ['ar', 'ur', 'fa'].includes(locale);
  const S      = makeStyles(font, isRTL);

  return (
    <Document
      title={`${labels.title} — ${data.bookingRef}`}
      author="UTUBooking.com"
      language={locale}
    >
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <Text style={S.headerTitle}>{labels.title}</Text>
          <Text style={S.headerRef}>{labels.refLabel}: {data.bookingRef}</Text>
          <View style={S.statusBadge}>
            <Text style={S.statusText}>{labels.statusLabel}: {labels.statusValue}</Text>
          </View>
        </View>

        <View>
          <View style={S.row}>
            <Text style={S.rowLabel}>{labels.guestLabel}</Text>
            <Text style={S.rowValue}>{data.guestName}</Text>
          </View>
          <View style={S.row}>
            <Text style={S.rowLabel}>{labels.hotelLabel}</Text>
            <Text style={S.rowValue}>{data.hotelName}</Text>
          </View>
          <View style={S.row}>
            <Text style={S.rowLabel}>{labels.checkInLabel}</Text>
            <Text style={S.rowValue}>{data.checkIn}</Text>
          </View>
          <View style={S.row}>
            <Text style={S.rowLabel}>{labels.checkOutLabel}</Text>
            <Text style={S.rowValue}>{data.checkOut}</Text>
          </View>
          <View style={S.row}>
            <Text style={S.rowLabel}>{labels.nightsLabel}</Text>
            <Text style={S.rowValue}>{String(data.nights)}</Text>
          </View>
        </View>

        <View style={S.totalRow}>
          <Text style={S.totalLabel}>{labels.totalLabel}</Text>
          <Text style={S.totalValue}>{data.totalAmount}</Text>
        </View>

        <View style={S.footer}>
          <Text style={S.thankYou}>{labels.thankYou}</Text>
          <Text style={S.footerText}>{labels.poweredBy}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ── Buffer generator — call from API routes only ──────────────────────────────
export async function generateBookingPDF(data: BookingConfirmationData): Promise<Buffer> {
  const stream = await pdf(<BookingDocument data={data} />).toBuffer();

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  return Buffer.concat(chunks);
}

export default BookingDocument;
