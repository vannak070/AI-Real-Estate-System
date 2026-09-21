import { api } from './api';

/**
 * Cross-domain derived stats used by Agents/Dashboard/Reports. None of these
 * are backed by their own endpoint — each combines rows already served by
 * crm/sales/finance/identity's own APIs, the same "admin composes clean API
 * calls" pattern used for Campaigns/ContractsPage/CommissionsPage.
 */

type UserRow = Awaited<ReturnType<typeof api.identity.users.list.query>>[number];
type LeadRow = Awaited<ReturnType<typeof api.crm.leads.list.query>>[number];
type ContractRow = Awaited<ReturnType<typeof api.sales.contracts.list.query>>[number];
type CommissionRow = Awaited<ReturnType<typeof api.finance.commissions.list.query>>[number];

const CLOSED_WON_STATUSES = ['ACTIVE', 'COMPLETED'];

export interface AgentStats {
  agent: UserRow;
  leads: number;
  deals: number;
  conversion: number;
  revenue: number;
  commission: number;
  target: number;
  attainment: number;
}

export function computeAgentLeaderboard(
  users: UserRow[],
  leads: LeadRow[],
  contracts: ContractRow[],
  commissions: CommissionRow[],
): AgentStats[] {
  const agents = users.filter((u) => u.role.key === 'AGENT' || u.role.key === 'SALES_MANAGER');
  return agents
    .map((agent) => {
      const agentContracts = contracts.filter(
        (c) => c.agentId === agent.id && CLOSED_WON_STATUSES.includes(c.status),
      );
      const revenue = agentContracts.reduce((s, c) => s + c.netPrice, 0);
      const agentLeads = leads.filter((l) => l.ownerId === agent.id);
      const won = agentLeads.filter((l) => l.stage === 'WON').length;
      const commission = commissions.filter((c) => c.agentId === agent.id).reduce((s, c) => s + c.amount, 0);
      const target = agent.target ?? 0;
      return {
        agent,
        deals: agentContracts.length,
        revenue,
        leads: agentLeads.length,
        conversion: agentLeads.length ? (won / agentLeads.length) * 100 : 0,
        commission,
        target,
        attainment: target ? (revenue / target) * 100 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export interface CampaignStats {
  leads: number;
  deals: number;
  revenue: number;
}

export function computeCampaignStats(campaignId: string, leads: LeadRow[], contracts: ContractRow[]): CampaignStats {
  const campaignLeads = leads.filter((l) => l.campaignId === campaignId);
  const wonContactIds = new Set(campaignLeads.filter((l) => l.stage === 'WON').map((l) => l.contactId));
  const revenue = contracts
    .filter((c) => wonContactIds.has(c.contactId) && CLOSED_WON_STATUSES.includes(c.status))
    .reduce((a, c) => a + c.netPrice, 0);
  return { leads: campaignLeads.length, deals: wonContactIds.size, revenue };
}

export function contractedValue(contracts: ContractRow[]) {
  return contracts.filter((c) => CLOSED_WON_STATUSES.includes(c.status)).reduce((a, c) => a + c.netPrice, 0);
}

export function pipelineValue(leads: LeadRow[]) {
  return leads
    .filter((l) => !['WON', 'LOST'].includes(l.stage))
    .reduce((a, l) => a + ((l.budgetMin ?? 0) + (l.budgetMax ?? 0)) / 2, 0);
}

export function hotLeadCount(leads: LeadRow[]) {
  return leads.filter((l) => l.temperature === 'HOT' && !['WON', 'LOST'].includes(l.stage)).length;
}
