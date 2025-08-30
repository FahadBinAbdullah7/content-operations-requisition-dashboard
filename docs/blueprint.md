# **App Name**: SheetFlow

## Core Features:

- Dashboard Display: Display real-time ticket data (Total, Solved, WIP) from a connected Google Sheet on the homepage. 
- Navigation: Navbar with links to 'Home', and 'Create New Ticket'.
- Ticket Submission Form: Dynamic form generation based on Google Sheet headers with fields for Product/Course/Requisition Name, Type, Timeline, Team(s), Details, and Requisition Breakdown Link. Form Submission directly populates the Google Sheet.
- Ticket List View: Display submitted tickets in a sortable and filterable list view with key information like the subject, and current status. Allows the selection of tickets for conversion to projects.
- Kanban Board: Interactive Kanban board for visualizing project tasks, their status, and assigned team members. Drag-and-drop functionality for task management, accessible and visible across the entire department.
- Intelligent Ticket Routing: AI tool to automatically categorize and prioritize incoming tickets based on keywords in the description or product/course/requisition name using the labels configured from the admin settings, suggest related knowledge base articles and the recommended team assignment.

## Style Guidelines:

- Primary color: A vibrant blue (#29ABE2) to reflect efficiency and clarity in project management.
- Background color: Light gray (#F5F5F5) for a clean and modern interface.
- Accent color: A bright green (#90EE90) to highlight key actions and statuses.
- Font pairing: 'Inter' (sans-serif) for both headlines and body text to maintain a modern and readable interface.
- Use simple, outline-style icons from a library like Material Icons to represent different ticket types, teams, and statuses. Keep icon set consistent throughout the app.
- Dashboard and Kanban board should utilize a grid-based layout for responsiveness and clarity. Cards for ticket summaries and tasks provide clear information hierarchy.
- Subtle transitions when moving tasks on the Kanban board to provide visual feedback to the user.