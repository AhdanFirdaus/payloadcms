import { ReactElement } from "react";
import LoginForm from "./_components/LoginForm";

export default async function page(): Promise<ReactElement> {
    return (
        <div className="h-[calc(100vh-3rem)]">
            <LoginForm />
        </div>
    )
}