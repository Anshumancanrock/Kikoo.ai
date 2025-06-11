import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { LoginModelProps } from "@/types/LoginModelProps";

export default function LoginModal({ onClose, showLoginModal }: LoginModelProps) {
    return (
        <Dialog open={showLoginModal} onOpenChange={(open) => {
            if (!open) {
                onClose();
            }
        }}>
            <DialogContent>                <DialogHeader>
                    <DialogTitle>Login to Continue</DialogTitle>
                    <DialogDescription>
                        Sign in to access your account and save your interactions.
                    </DialogDescription>
                </DialogHeader>
                <Button className="dark:bg-white bg-black text-white hover:bg-black/90 dark:text-black dark:hover:bg-white/95" onClick={() => signIn("google")}>Login with Google</Button>
            </DialogContent>
        </Dialog>
    );
};