"use client"

import { MAX_FREE_USES, useUsageTracker } from "@/hooks/useUsageTracker";
import { useSession } from "next-auth/react";
import { CgInfinity } from "react-icons/cg";

export default function UsageCount() {
    const { data: session } = useSession()
    return (
        <p className="text-xs flex items-center">Credits:&nbsp;&nbsp;<span><CgInfinity className="w-4 h-4" /></span></p>
    )
}