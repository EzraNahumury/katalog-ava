import type { Metadata } from 'next';
import MemberPortal from '@/components/portal/MemberPortal';

export const metadata: Metadata = {
  title: 'Poin Member — Ava Sportivo',
  description: 'Cek saldo poin belanja kamu di Ava Sportivo.',
};

export default function PoinPage() {
  return <MemberPortal />;
}
