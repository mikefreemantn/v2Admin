'use client';

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { signIn, confirmSignIn, resetPassword, confirmResetPassword } from 'aws-amplify/auth'; 
import type { SignInOutput } from 'aws-amplify/auth'; 
import { useRouter } from 'next/navigation'; 

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Define the form schema using Zod
const loginSchema = z.object({
    email: z.string().email({
        message: "Please enter a valid email address.",
    }),
    password: z.string().min(1, { 
        message: "Password is required.",
    }),
});

// Schema for the new password step
const newPasswordSchema = z.object({
    newPassword: z.string().min(8, {
        message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"], 
});

export function LoginForm() {
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);
    // Use null as initial state, indicating login hasn't been attempted yet
    const [signInStep, setSignInStep] = React.useState<SignInOutput['nextStep']['signInStep'] | 'SIGNED_IN' | null>(null);
    // Store the original email/username for confirmSignIn if needed
    const [usernameForConfirm, setUsernameForConfirm] = React.useState<string | null>(null);

    const router = useRouter();

    // State specifically for manually controlled new password fields
    const [manualNewPassword, setManualNewPassword] = React.useState<string>("");
    const [manualConfirmPassword, setManualConfirmPassword] = React.useState<string>("");
    const [manualPasswordError, setManualPasswordError] = React.useState<string | null>(null);

    // Forgot password flow states
    const [isForgotPassword, setIsForgotPassword] = React.useState<boolean>(false);
    const [isResetCodeSent, setIsResetCodeSent] = React.useState<boolean>(false);
    const [resetCode, setResetCode] = React.useState<string>("");
    const [resetEmail, setResetEmail] = React.useState<string>("");

    // Form for initial login
    const loginForm = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    // 1. Define initial login submit handler.
    async function onLoginSubmit(values: z.infer<typeof loginSchema>) {
        console.log("LoginForm: onLoginSubmit CALLED.");
        setIsLoading(true);
        setError(null);
        setSignInStep(null); // Reset step on new attempt
        setUsernameForConfirm(null);
        console.log("Login attempt with:", values.email);

        try {
            const { isSignedIn, nextStep } = await signIn({
                username: values.email,
                password: values.password,
            });

            console.log('Sign in result:', { isSignedIn, nextStep });

            if (isSignedIn) {
                console.log('Login successful!');
                setSignInStep('SIGNED_IN');
                router.push('/'); 
            } else {
                console.log('Next step required:', nextStep.signInStep);
                setSignInStep(nextStep.signInStep);
                // Store username needed for confirmSignIn
                setUsernameForConfirm(values.email);
                // Clear sensitive fields if needed, or reset forms
                loginForm.reset();
            }

        } catch (err: any) {
            console.error("Login failed:", err);
            
            // Special handling for already authenticated users
            if (err.name === 'UserAlreadyAuthenticatedException') {
                console.log('User is already authenticated, redirecting to home page');
                // No need to show error, just redirect
                router.push('/');
                return;
            }
            
            setError(err.message || "Invalid email or password."); 
        } finally {
            setIsLoading(false);
        }
    }

    // Handle initiating the forgot password flow
    async function handleForgotPassword(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!resetEmail) {
            setError("Please enter your email address.");
            setIsLoading(false);
            return;
        }

        try {
            await resetPassword({
                username: resetEmail,
            });
            
            setIsResetCodeSent(true);
            console.log('Password reset code sent to email');
        } catch (err: any) {
            console.error("Failed to initiate password reset:", err);
            setError(err.message || "Failed to send reset code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    // Handle confirming the password reset with code and new password
    async function handleResetPasswordConfirm(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!resetCode) {
            setError("Please enter the verification code sent to your email.");
            setIsLoading(false);
            return;
        }

        if (manualNewPassword.length < 8) {
            setError("Password must be at least 8 characters.");
            setIsLoading(false);
            return;
        }

        if (manualNewPassword !== manualConfirmPassword) {
            setError("Passwords don't match.");
            setIsLoading(false);
            return;
        }

        try {
            await confirmResetPassword({
                username: resetEmail,
                confirmationCode: resetCode,
                newPassword: manualNewPassword,
            });
            
            // Reset states
            setIsForgotPassword(false);
            setIsResetCodeSent(false);
            setResetCode("");
            setManualNewPassword("");
            setManualConfirmPassword("");
            
            // Show success message
            alert("Password reset successful! Please log in with your new password.");
            
        } catch (err: any) {
            console.error("Failed to confirm password reset:", err);
            setError(err.message || "Failed to reset password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    // 2. Define new password submit handler (using manual state)
    async function onNewPasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault(); // Prevent default form submission
        setIsLoading(true);
        setError(null);
        setManualPasswordError(null);

        // Manual Validation
        if (manualNewPassword.length < 8) {
            setManualPasswordError("Password must be at least 8 characters.");
            setIsLoading(false);
            return;
        }
        if (manualNewPassword !== manualConfirmPassword) {
            setManualPasswordError("Passwords don't match.");
            setIsLoading(false);
            return;
        }

        if (!usernameForConfirm) {
            setError("Username is missing. Please try logging in again.");
            setIsLoading(false);
            setSignInStep(null); // Reset to login step
            return;
        }

        try {
            // Correct structure: just the challengeResponse
            const { isSignedIn, nextStep } = await confirmSignIn({
                challengeResponse: manualNewPassword,
            });

            console.log('Confirm sign in result:', { isSignedIn, nextStep });

            if (isSignedIn) {
                console.log('New password set and signed in successfully!');
                setSignInStep('SIGNED_IN');
                router.push('/'); 
            } else {
                 // Handle unexpected further steps if necessary
                 console.error('Unexpected next step after setting new password:', nextStep);
                 setError(`Unexpected sign-in step: ${nextStep?.signInStep || 'Unknown'}`);
                 setSignInStep(null); // Reset to login
            }

        } catch (err: any) {
            console.error("Failed to set new password:", err);
            setError(err.message || "Failed to set new password.");
            // Optionally reset step based on error type, e.g., if password doesn't meet policy
            // setSignInStep(null); // Or keep on new password step?
        } finally {
            setIsLoading(false);
        }
    }

    console.log("LoginForm: Rendering Login Form Card.");
    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle className="text-2xl">Admin Login</CardTitle>
                <CardDescription>
                    {signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
                        ? "Please set a new password."
                        : isForgotPassword 
                            ? "Reset your password"
                            : "Enter your email below to login to your account."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isForgotPassword ? (
                    // Forgot Password Form
                    !isResetCodeSent ? (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reset-email">Email</Label>
                                <Input 
                                    id="reset-email"
                                    type="email" 
                                    placeholder="admin@example.com" 
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <div className="text-sm font-medium text-destructive">{error}</div>}
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Sending..." : "Send Reset Code"}
                            </Button>
                            <div className="text-center">
                                <Button 
                                    variant="link" 
                                    type="button" 
                                    onClick={() => {
                                        setIsForgotPassword(false);
                                        setError(null);
                                    }}
                                >
                                    Back to Login
                                </Button>
                            </div>
                        </form>
                    ) : (
                        // Code verification and new password form
                        <form onSubmit={handleResetPasswordConfirm} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reset-code">Verification Code</Label>
                                <Input 
                                    id="reset-code"
                                    type="text" 
                                    placeholder="Enter code from email" 
                                    value={resetCode}
                                    onChange={(e) => setResetCode(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input 
                                    id="new-password"
                                    type="password" 
                                    value={manualNewPassword}
                                    onChange={(e) => setManualNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm Password</Label>
                                <Input 
                                    id="confirm-password"
                                    type="password" 
                                    value={manualConfirmPassword}
                                    onChange={(e) => setManualConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <div className="text-sm font-medium text-destructive">{error}</div>}
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Resetting..." : "Reset Password"}
                            </Button>
                            <div className="text-center">
                                <Button 
                                    variant="link" 
                                    type="button" 
                                    onClick={() => {
                                        setIsForgotPassword(false);
                                        setIsResetCodeSent(false);
                                        setError(null);
                                    }}
                                >
                                    Back to Login
                                </Button>
                            </div>
                        </form>
                    )
                ) : signInStep !== 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' ? (
                    // Show Login Form - Add key
                    <Form {...loginForm} key="login-form">
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                            <FormField
                                control={loginForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="admin@example.com" {...field} type="email" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={loginForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="********" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {error && (
                                <p className="text-sm font-medium text-destructive">{error}</p>
                            )}
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Logging in..." : "Login"}
                            </Button>
                            <div className="text-center mt-2">
                                <Button 
                                    variant="link" 
                                    type="button" 
                                    className="text-sm text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                        setIsForgotPassword(true);
                                        setResetEmail(loginForm.getValues().email || "");
                                        setError(null);
                                    }}
                                >
                                    Forgot password?
                                </Button>
                            </div>
                        </form>
                    </Form>
                ) : (
                    // Show Manually Controlled New Password Form
                    <form onSubmit={onNewPasswordSubmit} className="space-y-4" key="new-password-form-manual">
                        {/* Manual New Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                placeholder="********"
                                value={manualNewPassword}
                                onChange={(e) => setManualNewPassword(e.target.value)}
                                required
                            />
                            {/* Display manual validation errors here if needed, or rely on the main error state */}
                        </div>

                        {/* Manual Confirm Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="********"
                                value={manualConfirmPassword}
                                onChange={(e) => setManualConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        {/* Display main error or manual password error */}
                        {(error || manualPasswordError) && (
                            <p className="text-sm font-medium text-destructive">{error || manualPasswordError}</p>
                        )}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Setting New Password..." : "Set New Password"}
                        </Button>
                    </form>
                )}
            </CardContent>
            {/* Optional Footer for things like "Forgot Password?" */}
            {/* <CardFooter>
                <Button variant="link" className="px-0">
                    Forgot password?
                </Button>
            </CardFooter> */}
        </Card>
    );
}
