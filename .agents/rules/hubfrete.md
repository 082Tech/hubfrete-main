---
trigger: always_on
---

# 🤖 AI Instructor: HubFrete Project

This file is the compass for any artificial intelligence working on this project. It defines the expected behavior, technical guidelines, and strategic vision of HubFrete. > **NO DRASTIC ARCHITECTURAL CHANGES without prior explicit user permission.**

# **NEVER OVERRIDE THE RULES BELOW**

# **NEVER MAKE ANY CHANGES WITHOUT VIEWING THESE INSTRUCTIONS FIRST**

# **NEVER MAKE ANY CHANGES WITHOUT EXPLICIT USER PERMISSION**

# **MANDATORY CONTEXT GATHERING BEFORE ANY ACTION**

> **CRITICAL RULE**: Before proposing solutions, writing code, or making architectural decisions, you **MUST** read the following supplemental documentation files to understand the full context of the project:
>
> 1.  `README.md` (General project setup and technical foundation)
> 2.  `DOCUMENTACAO_FISCAL.md` (Deep dive into the automated fiscal workflow)
> 3.  `modifications/modifications.md` (Current roadmap, pending tasks, and recent changes)
> 4.  **Any other `.md` files present in the project root or core directories.**
> 5.  **Every change you make must first be made to the test bench, id: ublyithvarvtqbwmxtyh. After testing, you must pass the changes to production: eilwdavgnuhfyxfqkvrk**

## 🎯 Central Objective: The Logistics "Link"

**HubFrete** is not just a tax document issuer; it is a **Logistics Marketplace / Ecosystem**. Its main objective is to **automate and optimize the connection between Shippers (Embarcadores) and Carriers (Transportadoras)**.

### Ecosystem Pillars:

1.  **Freight Marketplace**: Where Shippers publish demand and Carriers offer capacity.
2.  **Real-Time Operations Management**: Transformation of Loads (Cargas) into **Deliveries (Entregas)** and **Trips (Viagens)**, with GPS tracking and direct chat between the parties.
3.  **"Zero-Touch" Fiscal Automation**: CT-e and MDF-e are automatically generated as a consequence of the logistics operation, removing bureaucratic friction.

## 📖 Domain Dictionary (Mandatory Reading Before Coding)

### 1. Organization and Hierarchy (Companies and Users)

- **Company (Matriz)**: The logical root, which can be `EMBARCADOR` (Shipper) or `TRANSPORTADORA` (Carrier).
- **Branch (Filial)**: Linked to a Company (has its own CNPJ and State Registration). **The entire scope of data (loads, deliveries, vehicles) is filtered by Branch (`filial_id`)**.
- **User**: Linked to one or more branches (`usuarios_filiais` table) with defined roles (e.g., `ADMIN`, `OPERADOR`).
- **Onboarding**: Starts in the `pre_cadastros` table. The Control Tower (Admin) approves and invites the tenant.

### 2. Fleet Management (Minha Frota)

Carriers register their physical resources:

- **Drivers (Motoristas)**: Can be inactive/active. Possess a driver's license (CNH).
- **Vehicles/Truck Cabs (Cavalos)** and **Trailers (Carrocerias/Reboques)**: Control capacity in KG and M3. They are separated, but vehicle types like "truck" or "vuc" have an integrated trailer.

### 3. The Operational Backbone (Load Lifecycle)

The progression of merchandise in the system follows a strict cycle:

1.  **The Load (`cargas`)**: Published by the Shipper in the _Marketplace_. Has requirements (e.g., refrigerated).
2.  **The Delivery (`entregas`)**: Created when the Carrier _accepts_ the load (makes the "Match"). The **Load is transformed into a Delivery**. At this point, the carrier allocates a Driver, Vehicle, and Trailer. (Base status: `aguardando`).
3.  **The Trip (`viagens`)**: The physical transport unit. A Trip can contain MULTIPLE Deliveries (grouping via the `viagem_entregas` relational table). The trip status (`em_curso`, `concluida`) dictates the real-time GPS and issues the MDF-e grouping the CT-es of the deliveries.

## 👥 Actors and Workflows

- **Shipper (Embarcador)**: Publishes loads with technical requirements (vehicle type, temperature, weight, material type). Tracks the routing and status of deliveries.

* **Carrier (Transportadora)**: Is the engine of the logistics operation. Its responsibilities include:
  - **Fleet and HR Management:** Registers vehicles (cabs), trailers (reboques), and drivers on the web platform.
  - **Mobile Access:** Provides access for drivers to use the HubFrete app.
  - **Marketplace (The Match):** Analyzes and **accepts** loads published by shippers.
  - **Operationalization:** Designates which vehicle, trailer, and driver will execute the trip.
  - **Document Management:** Attaches Invoices (NF-e/XML/DANFE) and other necessary documents for the trip. The system then takes care of the CT-e/MDF-e automation.
* **Driver (Motorista)**: Physically executes the trip. Uses the (mobile) app to record the manifest, interact via chat, log stops, update GPS in real time, and send photos of delivery receipts (canhotos).
* **Admin (Control Tower)**: Omniscient view. Approves company pre-registrations, monitors global KPIs, manages support tickets, and acts in the resolution of complex problems.

## 🛡️ AI Rules of Engagement

1.  **Preserve the "Match"**: Any change to the load allocation logic (`acceptCarga` in `CargasDisponiveis.tsx`) must ensure that drivers, vehicles, and weights remain coherent.
2.  **Multilevel Context**: Understand that the project operates in levels: `Load` (The demand) -> `Delivery` (The match) -> `Trip` (The execution).
3.  **Critical Communication**: The Chat and GPS Tracking are critical channels of trust between the parties. Maintaining the integrity of the `chatService` and location hooks is vital.
4.  **Fiscal as a Service**: Treat fiscal automations (`supabase/functions/focusnfe-*`) as sub-services that react to logistics operation events (delivery/trip status triggers).

## 🏗️ Technology Stack & Recommendations

- **Frontend**: React (Vite) + TypeScript.
- **Components**: Shadcn UI (Radix) + Tailwind CSS + Lucide Icons.
- **Data Layer**: TanStack Query (React Query) for aggressive caching and smooth interfaces.
- **Real-time**: Supabase Realtime for chat and monitoring logs.
- **Maps**: Google Maps API for routing and Leaflet for lighter dashboards.

## 📂 Domain Structure and Features (Full Map)

The project is divided into three main portals and a services layer (Edge Functions):

### 1. Shipper Portal (`src/pages/portals/embarcador/`)

- `CargasPublicadas.tsx`: Creation and listing of demands.
- `GestaoCargas.tsx`: The heart of tracking. Map visualization (Leaflet), attachment of Invoices (XML), and access to trip chats.
- `HistoricoCargas.tsx`: Past log of operations.
- `Relatorios.tsx`, `Configuracoes.tsx`, `ContatosSalvos.tsx`, `UsuariosEmpresa.tsx`, `GerenciarFiliais.tsx`.

### 2. Carrier Portal (`src/pages/portals/transportadora/`)

- `CargasDisponiveis.tsx`: The "Tinder" of loads. Acceptance of freight with strict capacity validation (trailer weight).
- `MinhaFrota.tsx`: Complex registration of Drivers, Vehicles (Cabs), and Trailers (with photo uploads for DUT/Tracker).
- `OperacaoDiaria.tsx`: The execution control panel. GPS tracking, Chat with Driver, viewing of Receipts (Canhotos), and status control (`em_coleta`, `em_transito`).
- `HistoricoEntregas.tsx`, `Relatorios.tsx`, `Configuracoes.tsx`, `UsuariosEmpresa.tsx`, `GerenciarFiliais.tsx`.

### 3. Admin Portal / Control Tower (`src/pages/admin/`)

- `TorreControle.tsx`: Macro general dashboard (KPIs, Active Users, Maps).
- `PreCadastros.tsx`: Approval/Rejection of onboarding for new companies.
- `Chamados.tsx`: Internal support system (Ticketing) with integrated Admin-User Chat screen.
- `DocumentosValidacao.tsx`: Validity audit of CNHs, ANTTs, and Driver/Vehicle documents.
- `PerformanceKPIs.tsx`: Driver ranking and fine operational metrics.
- `Monitoramento.tsx`: Global map of all active fleets in real time.
- _Master CRUD Screens_: `Empresas.tsx`, `Usuarios.tsx`, `MotoristasAdmin.tsx`, `VeiculosAdmin.tsx`, `CargasAdmin.tsx`.

### 4. Integrations and Supabase Edge Functions (`supabase/functions/`)

- `focusnfe-cte/` and `focusnfe-mdfe/`: Triggered via database triggers or manual button when documents (NFe, Trip data) are complete.
- `validate-nfe/`: Function to import the Invoice XML into the system using the Focus API.
- `create-chat-for-entrega/`: Bypasses RLS to create the real-time chat channel via Supabase Realtime securely.
- `create-driver-auth/` / `delete-driver-auth/`: Manages Supabase Auth accounts for Drivers' Mobile access.
- `push-notifications/`: (Planned/Active) for Mobile App alerts.

---

_When adding new features, ask yourself: "How does this improve the connection or trust between the Shipper and the Carrier?"_

---

_This document must be kept updated with every major architectural change._
