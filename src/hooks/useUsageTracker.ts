import { useEffect, useState } from "react";

export const MAX_FREE_USES = 999999; // Set to a very high number for effectively unlimited uses

export const useUsageTracker = () => {
    const [usageCount, setUsageCount] = useState(0);

    useEffect(() => {
        const count = localStorage.getItem("usageCount");
        setUsageCount(count ? parseInt(count, 10) : 0);
    }, []);

    const incrementUsage = () => {
        const newCount = usageCount + 1;
        localStorage.setItem("usageCount", newCount.toString());
        setUsageCount(newCount);
    };

    const resetUsage = () => {
        localStorage.removeItem("usageCount");
        setUsageCount(0);
    };

    return { usageCount, incrementUsage, resetUsage, isLimitReached: usageCount >= MAX_FREE_USES };
};