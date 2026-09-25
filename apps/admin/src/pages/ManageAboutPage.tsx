import { useState } from "react";
import {
  Building2,
  Users,
  Award,
  Calendar,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { Button, TextInput } from '@era/ui';
import { useCan } from '../store/auth';
import { ImageGallery } from '../app/components/ImageGallery';
import {
  useAboutContent,
  useUpdateAboutContent,
  useAboutMilestones,
  useCreateAboutMilestone,
  useUpdateAboutMilestone,
  useDeleteAboutMilestone,
  useAboutTeam,
  useCreateAboutTeamMember,
  useUpdateAboutTeamMember,
  useDeleteAboutTeamMember,
  useSetAboutTeamMemberPhoto,
  useRemoveAboutTeamMemberPhoto,
  useAboutAwards,
  useCreateAboutAward,
  useUpdateAboutAward,
  useDeleteAboutAward,
} from '../data/settings';

type Content = NonNullable<ReturnType<typeof useAboutContent>['data']>;
type Milestone = NonNullable<ReturnType<typeof useAboutMilestones>['data']>[number];
type TeamMember = NonNullable<ReturnType<typeof useAboutTeam>['data']>[number];
type AwardRow = NonNullable<ReturnType<typeof useAboutAwards>['data']>[number];

function OverviewTab({ content, canWrite }: { content: Content; canWrite: boolean }) {
  const [form, setForm] = useState(content);
  const [saved, setSaved] = useState(false);
  const update = useUpdateAboutContent();

  const missing = !form.pageTitle.trim() ? ['Page title'] : [];

  function set<K extends keyof Content>(key: K, value: Content[K]) {
    setForm({ ...form, [key]: value });
    setSaved(false);
  }

  function save() {
    if (missing.length > 0) return;
    update.mutate(form, { onSuccess: () => setSaved(true) });
  }

  const values = form.values;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Company Overview Content</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Page Title</label>
        <TextInput className="w-full" value={form.pageTitle} onChange={(e) => set('pageTitle', e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
        <textarea
          rows={2}
          value={form.subtitle ?? ''}
          onChange={(e) => set('subtitle', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Main Description (Paragraph 1)</label>
        <textarea
          rows={4}
          value={form.paragraph1 ?? ''}
          onChange={(e) => set('paragraph1', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Main Description (Paragraph 2)</label>
        <textarea
          rows={3}
          value={form.paragraph2 ?? ''}
          onChange={(e) => set('paragraph2', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
        />
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Statistics</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Active Projects</label>
            <TextInput className="w-full" value={form.statProjects ?? ''} onChange={(e) => set('statProjects', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Leads Qualified</label>
            <TextInput className="w-full" value={form.statLeads ?? ''} onChange={(e) => set('statLeads', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">AI Accuracy</label>
            <TextInput className="w-full" value={form.statAccuracy ?? ''} onChange={(e) => set('statAccuracy', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Sales Professionals</label>
            <TextInput className="w-full" value={form.statTeamSize ?? ''} onChange={(e) => set('statTeamSize', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mission Statement</h3>
        <textarea
          rows={3}
          value={form.mission ?? ''}
          onChange={(e) => set('mission', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Values</h3>
        <div className="space-y-3">
          {values.map((value, idx) => (
            <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <TextInput
                className="flex-1"
                value={value}
                onChange={(e) => {
                  const next = [...values];
                  next[idx] = e.target.value;
                  set('values', next);
                }}
              />
              <button
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                onClick={() => set('values', values.filter((_, i) => i !== idx))}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {canWrite && (
            <button
              className="flex items-center space-x-2 px-4 py-2 text-[#001F5B] hover:bg-gray-50 rounded-lg transition"
              onClick={() => set('values', [...values, ''])}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Value</span>
            </button>
          )}
        </div>
      </div>

      {missing.length > 0 && <p className="text-sm text-red-600">Required: {missing.join(', ')}.</p>}
      {update.error && <p className="text-sm text-red-600">{update.error.message}</p>}
      {saved && !update.isPending && <p className="text-sm text-green-700">✓ Saved.</p>}

      {canWrite && (
        <button
          onClick={save}
          disabled={missing.length > 0 || update.isPending}
          className="flex items-center space-x-2 px-6 py-3 bg-[#001F5B] text-white rounded-lg hover:bg-[#EF2D2C] transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{update.isPending ? 'Saving…' : 'Save Overview'}</span>
        </button>
      )}
    </div>
  );
}

function MilestoneRow({ milestone, canWrite }: { milestone: Milestone; canWrite: boolean }) {
  const [form, setForm] = useState(milestone);
  const update = useUpdateAboutMilestone();
  const del = useDeleteAboutMilestone();

  const missing = [!form.year.trim() && 'Year', !form.title.trim() && 'Title', !form.description.trim() && 'Description'].filter(
    (m): m is string => typeof m === 'string',
  );

  return (
    <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <TextInput
              className="px-3 py-1.5 text-sm font-semibold w-40"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="Year or stage (e.g. 2024, Today)"
            />
          </div>
          <TextInput
            className="w-full mb-3 font-semibold text-lg"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Milestone Title"
          />
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
          />
        </div>
        {canWrite && (
          <button className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition" onClick={() => del.mutate(milestone.id)}>
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
      {missing.length > 0 && <p className="text-xs text-red-600 mb-2">Required: {missing.join(', ')}.</p>}
      {update.error && <p className="text-xs text-red-600 mb-2">{update.error.message}</p>}
      {del.error && <p className="text-xs text-red-600 mb-2">{del.error.message}</p>}
      {canWrite && (
        <Button
          size="sm"
          disabled={missing.length > 0 || update.isPending}
          onClick={() => update.mutate({ id: milestone.id, year: form.year, title: form.title, description: form.description })}
        >
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      )}
    </div>
  );
}

function HistoryTab({ milestones, canWrite }: { milestones: Milestone[]; canWrite: boolean }) {
  const create = useCreateAboutMilestone();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Company History Timeline</h2>
        {canWrite && (
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-[#001F5B] text-white rounded-lg hover:bg-[#EF2D2C] transition"
            disabled={create.isPending}
            onClick={() => create.mutate({ year: 'New', title: 'New milestone', description: 'Describe this milestone…', order: milestones.length })}
          >
            <Plus className="w-4 h-4" />
            <span>Add Milestone</span>
          </button>
        )}
      </div>
      {create.error && <p className="text-sm text-red-600">{create.error.message}</p>}
      <div className="space-y-4">
        {milestones.map((m) => (
          <MilestoneRow key={m.id} milestone={m} canWrite={canWrite} />
        ))}
        {milestones.length === 0 && <p className="text-sm text-gray-400">No milestones yet.</p>}
      </div>
    </div>
  );
}

function TeamMemberRow({ member, canWrite }: { member: TeamMember; canWrite: boolean }) {
  const [form, setForm] = useState(member);
  const update = useUpdateAboutTeamMember();
  const del = useDeleteAboutTeamMember();
  const setPhoto = useSetAboutTeamMemberPhoto();
  const removePhoto = useRemoveAboutTeamMemberPhoto();

  const missing = [!form.name.trim() && 'Name', !form.position.trim() && 'Position'].filter((m): m is string => typeof m === 'string');

  return (
    <div className={`p-6 rounded-xl border-2 ${member.isLeader ? 'bg-gradient-to-br from-[#EF2D2C]/10 to-white border-[#EF2D2C]/30' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 flex items-center gap-2">
          {member.isLeader && <Award className="w-4 h-4 text-[#EF2D2C]" />}
          {member.isLeader ? 'Leadership' : 'Team member'}
        </h3>
        {canWrite && (
          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" onClick={() => del.mutate(member.id)}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
          <TextInput className="w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
          <TextInput className="w-full" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        </div>
        {member.isLeader && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Biography</label>
            <textarea
              rows={6}
              value={form.bio ?? ''}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
            />
          </div>
        )}
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
        <ImageGallery
          images={member.photoUrl ? [member.photoUrl] : []}
          canWrite={canWrite && !member.photoUrl}
          onUpload={(dataUrl) => setPhoto.mutate({ id: member.id, dataUrl })}
          onRemove={() => removePhoto.mutate(member.id)}
          emptyHint="No photo — shows initials instead."
        />
      </div>
      {missing.length > 0 && <p className="text-xs text-red-600 mb-2">Required: {missing.join(', ')}.</p>}
      {update.error && <p className="text-xs text-red-600 mb-2">{update.error.message}</p>}
      {del.error && <p className="text-xs text-red-600 mb-2">{del.error.message}</p>}
      {setPhoto.error && <p className="text-xs text-red-600 mb-2">{setPhoto.error.message}</p>}
      {canWrite && (
        <Button
          size="sm"
          disabled={missing.length > 0 || update.isPending}
          onClick={() => update.mutate({ id: member.id, name: form.name, position: form.position, bio: form.bio })}
        >
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      )}
    </div>
  );
}

function TeamTab({ team, canWrite }: { team: TeamMember[]; canWrite: boolean }) {
  const create = useCreateAboutTeamMember();
  const leader = team.find((m) => m.isLeader);
  const rest = team.filter((m) => !m.isLeader);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Team Management</h2>
        {canWrite && (
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-[#001F5B] text-white rounded-lg hover:bg-[#EF2D2C] transition"
            disabled={create.isPending}
            onClick={() => create.mutate({ name: 'New team member', position: 'Position', order: team.length })}
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>
      {create.error && <p className="text-sm text-red-600">{create.error.message}</p>}

      {leader && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Leadership</h3>
          <TeamMemberRow member={leader} canWrite={canWrite} />
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Operations Support Team</h3>
        <div className="space-y-3">
          {rest.map((m) => (
            <TeamMemberRow key={m.id} member={m} canWrite={canWrite} />
          ))}
          {rest.length === 0 && !leader && <p className="text-sm text-gray-400">No team members yet.</p>}
        </div>
      </div>
    </div>
  );
}

function AwardCard({ award, canWrite }: { award: AwardRow; canWrite: boolean }) {
  const [form, setForm] = useState(award);
  const update = useUpdateAboutAward();
  const del = useDeleteAboutAward();

  const missing = [!form.year.trim() && 'Year', !form.title.trim() && 'Title', !form.organization.trim() && 'Organization'].filter(
    (m): m is string => typeof m === 'string',
  );

  return (
    <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
              <TextInput className="w-full" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Organization</label>
              <TextInput className="w-full" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Award Title</label>
            <TextInput className="w-full font-semibold" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
            />
          </div>
        </div>
        {canWrite && (
          <button className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition" onClick={() => del.mutate(award.id)}>
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
      {missing.length > 0 && <p className="text-xs text-red-600 mb-2">Required: {missing.join(', ')}.</p>}
      {update.error && <p className="text-xs text-red-600 mb-2">{update.error.message}</p>}
      {del.error && <p className="text-xs text-red-600 mb-2">{del.error.message}</p>}
      {canWrite && (
        <Button
          size="sm"
          disabled={missing.length > 0 || update.isPending}
          onClick={() =>
            update.mutate({ id: award.id, year: form.year, title: form.title, organization: form.organization, description: form.description })
          }
        >
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      )}
    </div>
  );
}

function AwardsTab({ awards, canWrite }: { awards: AwardRow[]; canWrite: boolean }) {
  const create = useCreateAboutAward();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Awards & Recognition</h2>
        {canWrite && (
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-[#001F5B] text-white rounded-lg hover:bg-[#EF2D2C] transition"
            disabled={create.isPending}
            onClick={() => create.mutate({ year: String(new Date().getFullYear()), title: 'New award', organization: 'Organization', order: awards.length })}
          >
            <Plus className="w-4 h-4" />
            <span>Add Award</span>
          </button>
        )}
      </div>
      {create.error && <p className="text-sm text-red-600">{create.error.message}</p>}
      <div className="space-y-4">
        {awards.map((a) => (
          <AwardCard key={a.id} award={a} canWrite={canWrite} />
        ))}
        {awards.length === 0 && <p className="text-sm text-gray-400">No awards yet.</p>}
      </div>
    </div>
  );
}

export function ManageAboutPage() {
  const [activeSection, setActiveSection] = useState<'overview' | 'history' | 'team' | 'awards'>('overview');
  const canWrite = useCan('settings:write');

  const { data: content } = useAboutContent();
  const { data: milestones } = useAboutMilestones();
  const { data: team } = useAboutTeam();
  const { data: awards } = useAboutAwards();

  const sections = [
    { id: 'overview' as const, label: 'Company Overview', icon: Building2 },
    { id: 'history' as const, label: 'Company History', icon: Calendar },
    { id: 'team' as const, label: 'Team Members', icon: Users },
    { id: 'awards' as const, label: 'Awards & Recognition', icon: Award },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage About Page</h1>
        <p className="text-gray-600">Update company information displayed on the About page</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 p-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    activeSection === section.id ? 'bg-[#001F5B] text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-8">
          {activeSection === 'overview' && (content ? <OverviewTab content={content} canWrite={canWrite} /> : null)}
          {activeSection === 'history' && <HistoryTab milestones={milestones ?? []} canWrite={canWrite} />}
          {activeSection === 'team' && <TeamTab team={team ?? []} canWrite={canWrite} />}
          {activeSection === 'awards' && <AwardsTab awards={awards ?? []} canWrite={canWrite} />}
        </div>
      </div>
    </div>
  );
}
