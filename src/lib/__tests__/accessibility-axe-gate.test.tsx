import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton, SkeletonText, SkeletonCard } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { renderForAxe, expectNoA11yViolations } from "@/lib/test/a11y";

/**
 * Phase 7 / 7.2 — WCAG 2.1 AA Accessibility Gate over the shared UI primitives.
 *
 * The primitives in `src/components/ui/` are reused across every surface of the
 * platform, so auditing them once with axe-core gates the entire design system.
 * Runs under jsdom; color-contrast is verified by the browser audit
 * (`scripts/a11y/accessibility-audit.ts`) since jsdom cannot compute layout.
 */
describe("Phase 7.2: WCAG 2.1 AA Accessibility Gate (shared UI primitives)", () => {
  const axeOptions = { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] };

  describe("Button", () => {
    it("default variant has no violations", async () => {
      const { container } = renderForAxe(<Button>Save changes</Button>);
      await expectNoA11yViolations(container, axeOptions);
    });

    it("destructive variant has no violations", async () => {
      const { container } = renderForAxe(<Button variant="destructive">Delete record</Button>);
      await expectNoA11yViolations(container, axeOptions);
    });

    it("icon-only button exposes an accessible name", async () => {
      const { container } = renderForAxe(
        <Button size="icon" aria-label="Close panel">
          ✕
        </Button>
      );
      await expectNoA11yViolations(container, axeOptions);
    });

    it("disabled button has no violations", async () => {
      const { container } = renderForAxe(<Button disabled>Not available</Button>);
      await expectNoA11yViolations(container, axeOptions);
    });
  });

  it("Badge has no violations", async () => {
    const { container } = renderForAxe(
      <div>
        <Badge>Default</Badge>
        <Badge variant="success">Approved</Badge>
        <Badge variant="warning">Pending</Badge>
        <Badge variant="destructive">Overdue</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
    );
    await expectNoA11yViolations(container, axeOptions);
  });

  it("Alert has no violations", async () => {
    const { container } = renderForAxe(
      <div>
        <Alert variant="error">Payment failed. Please retry.</Alert>
        <Alert variant="warning">Balance is low.</Alert>
        <Alert variant="success">Record saved.</Alert>
        <Alert variant="info">New circular available.</Alert>
      </div>
    );
    await expectNoA11yViolations(container, axeOptions);
  });

  it("Alert with dismiss button exposes a labelled dismiss control", async () => {
    const { container } = renderForAxe(
      <Alert variant="warning" onDismiss={() => {}}>
        Session is about to expire.
      </Alert>
    );
    await expectNoA11yViolations(container, axeOptions);
  });

  describe("Form controls", () => {
    it("Label + Input are properly associated", async () => {
      const { container } = renderForAxe(
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" placeholder="you@institution.edu" />
        </div>
      );
      await expectNoA11yViolations(container, axeOptions);
    });

    it("Label + Textarea are properly associated", async () => {
      const { container } = renderForAxe(
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" placeholder="Add a note" />
        </div>
      );
      await expectNoA11yViolations(container, axeOptions);
    });

    it("disabled inputs have no violations", async () => {
      const { container } = renderForAxe(
        <div>
          <Label htmlFor="locked">Locked field</Label>
          <Input id="locked" disabled value="read-only" />
        </div>
      );
      await expectNoA11yViolations(container, axeOptions);
    });
  });

  it("Card composition has no violations", async () => {
    const { container } = renderForAxe(
      <Card>
        <CardHeader>
          <CardTitle>Quarterly Report</CardTitle>
          <CardDescription>Summary for Q3</CardDescription>
        </CardHeader>
        <CardContent>Consolidated attendance and finances.</CardContent>
        <CardFooter>
          <Button>View details</Button>
        </CardFooter>
      </Card>
    );
    await expectNoA11yViolations(container, axeOptions);
  });

  describe("Tabs", () => {
    it("Tabs expose a labelled tablist with correct semantics", async () => {
      const { container } = renderForAxe(
        <Tabs defaultValue="overview">
          <TabsList aria-label="Report views">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Overview content</TabsContent>
          <TabsContent value="details">Details content</TabsContent>
        </Tabs>
      );
      await expectNoA11yViolations(container, axeOptions);
    });
  });

  it("Table exposes caption and proper header structure", async () => {
    const { container } = renderForAxe(
      <Table>
        <caption className="sr-only">Staff attendance summary</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Staff</TableHead>
            <TableHead scope="col">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell scope="row">Amina</TableCell>
            <TableCell>Present</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    await expectNoA11yViolations(container, axeOptions);
  });

  it("Avatar exposes fallback initials with no violations", async () => {
    const { container } = renderForAxe(<Avatar alt="Amina Rahman" fallback="Amina Rahman" />);
    await expectNoA11yViolations(container, axeOptions);
  });

  it("Skeleton states have no violations", async () => {
    const { container } = renderForAxe(
      <div>
        <Skeleton className="h-8 w-32" role="status" aria-label="Loading" />
        <SkeletonText lines={3} />
        <SkeletonCard />
      </div>
    );
    await expectNoA11yViolations(container, axeOptions);
  });

  it("Separator has no violations", async () => {
    const { container } = renderForAxe(
      <div>
        <p>Section one</p>
        <Separator />
        <p>Section two</p>
      </div>
    );
    await expectNoA11yViolations(container, axeOptions);
  });
});