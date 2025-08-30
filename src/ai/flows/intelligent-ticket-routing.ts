'use server';

/**
 * @fileOverview This file defines a Genkit flow for intelligent ticket routing.
 *
 * - intelligentTicketRouting - A function that handles the ticket routing process.
 * - IntelligentTicketRoutingInput - The input type for the intelligentTicketRouting function.
 * - IntelligentTicketRoutingOutput - The return type for the intelligentTicketRouting function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IntelligentTicketRoutingInputSchema = z.object({
  description: z.string().describe('The description of the ticket.'),
  productCourseRequisitionName: z.string().describe('The name of the product, course, or requisition.'),
  adminSettingsLabels: z.string().describe('The labels configured from the admin settings, as a string.'),
  knowledgeBaseArticles: z.string().describe('Knowledge base articles, as a string.'),
  teamNames: z.string().describe('List of available teams.'),
});
export type IntelligentTicketRoutingInput = z.infer<typeof IntelligentTicketRoutingInputSchema>;

const IntelligentTicketRoutingOutputSchema = z.object({
  category: z.string().describe('The category of the ticket.'),
  priority: z.string().describe('The priority of the ticket.'),
  relatedKnowledgeBaseArticles: z.string().describe('Related knowledge base articles.'),
  recommendedTeam: z.string().describe('The recommended team assignment.'),
});
export type IntelligentTicketRoutingOutput = z.infer<typeof IntelligentTicketRoutingOutputSchema>;

export async function intelligentTicketRouting(input: IntelligentTicketRoutingInput): Promise<IntelligentTicketRoutingOutput> {
  return intelligentTicketRoutingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'intelligentTicketRoutingPrompt',
  input: {schema: IntelligentTicketRoutingInputSchema},
  output: {schema: IntelligentTicketRoutingOutputSchema},
  prompt: `You are an expert ticket routing system.  Your job is to categorize and prioritize incoming tickets based on keywords in the description or product/course/requisition name using the labels configured from the admin settings, and to suggest related knowledge base articles and the recommended team assignment.

Description: {{{description}}}
Product/Course/Requisition Name: {{{productCourseRequisitionName}}}
Admin Settings Labels: {{{adminSettingsLabels}}}
Knowledge Base Articles: {{{knowledgeBaseArticles}}}
Team Names: {{{teamNames}}}

Output a JSON object with the following keys:
- category: The category of the ticket.
- priority: The priority of the ticket.
- relatedKnowledgeBaseArticles: Related knowledge base articles.
- recommendedTeam: The recommended team assignment.`,
});

const intelligentTicketRoutingFlow = ai.defineFlow(
  {
    name: 'intelligentTicketRoutingFlow',
    inputSchema: IntelligentTicketRoutingInputSchema,
    outputSchema: IntelligentTicketRoutingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
