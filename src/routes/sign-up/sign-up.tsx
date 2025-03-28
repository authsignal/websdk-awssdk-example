import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Link, useNavigate} from "react-router-dom";
import {useState} from "react";
import {useToast} from "@/hooks/use-toast";
import {signUp, signIn} from "@/lib/aws-auth";
import {authsignal} from "@/lib/authsignal";

const formSchema = z.object({
  email: z.string({required_error: "Enter your email"}).email({message: "Enter a valid email"}),
});

export function SignUp() {
  const [isLoading, setIsLoading] = useState(false);
  const {toast} = useToast();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = form.handleSubmit(async ({email}) => {
    setIsLoading(true);

    try {
      await signUp({
        username: email,
        password: Math.random().toString(36).slice(-16) + "X", // Dummy value - never used
        userAttributes: {
          email,
        },
      });

      const signInResult = await signIn({
        username: email,
      });

      if (signInResult.nextStep === "CUSTOM_CHALLENGE") {
        const token = signInResult.challengeParameters?.token;
        if (!token) {
          throw new Error("No token received from authentication challenge");
        }
        
        authsignal.setToken(token);
        await authsignal.email.enroll({email});
        
        navigate("/confirm-sign-up", {
          state: {
            email,
            session: signInResult.session,
            token
          }
        });
      }
    } catch (ex) {
      console.error(ex);

      if (ex instanceof Error && ex.name === "UsernameExistsException") {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An account with this email already exists",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create account",
        });
      }
    }

    setIsLoading(false);
  });

  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">Sign up</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Form {...form}>
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="username webauthn" spellCheck={false} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              Continue
            </Button>
          </form>
        </Form>
        <p className="text-sm text-center">
          Already have an account?{" "}
          <Link className="underline" to="/login">
            Sign in
          </Link>
        </p>
      </CardContent>
    </>
  );
}
