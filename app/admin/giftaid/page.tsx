import { AdminHeader } from "@/components/admin-header"
import { GiftAidPageClient } from "@/components/giftaid/giftaid-page-client"

export default async function GiftAidPage() {
  return (
    <>
      <AdminHeader title="Gift Aid" />
      <div className="px-4 pb-8 pt-2">
        <GiftAidPageClient />
      </div>
    </>
  )
}
