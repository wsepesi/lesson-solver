"use client";

/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as z from "zod"

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form"
import { type UseFormReturn, useForm } from "react-hook-form"

import { Input } from "./ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { Cross2Icon } from "@radix-ui/react-icons"

const FormSchema = z.object({
  email: z.string().trim().email(),
})

type Props = {
  emails: string[],
  setEmails: (emails: string[]) => void,
}

export default function EmailsInput(props: Props) {
    const { emails, setEmails } = props
    const form: UseFormReturn<z.infer<typeof FormSchema>> = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
        },
    })

  function onSubmit(values: z.infer<typeof FormSchema>) {
    setEmails([...emails, values.email])
    form.reset()
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
                <div className="flex flex-col">
                    <FormLabel>Emails</FormLabel>
                    <div className="flex flex-row">
                        {emails.map((email) => (
                            <button
                                key={email}
                                type="button"
                                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 mr-2 my-2 hover:cursor-pointer"
                                onClick={() => {
                                    setEmails(emails.filter((e) => e !== email))
                                }}
                            >
                                {email} <Cross2Icon className="ml-1" />
                            </button>
                            ))}
                    </div>
                </div>
              <FormControl>
                <Input placeholder="student@xyz.com" {...field} />
              </FormControl>
              <FormDescription>
                Hit enter to add an email. Click &apos;Send&apos; when you&apos;re done.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
