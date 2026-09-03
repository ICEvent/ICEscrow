import * as React from 'react';
import type { Profile } from '../../api/profile/profile.did';
import { useOneblock } from '../Store';

type CounterpartyPickerProps = {
    label: string;
    value: string;
    onChange: (principal: string) => void;
    excludePrincipal?: string;
};

const truncate = (value: string) => value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;

export default function CounterpartyPicker({ label, value, onChange, excludePrincipal }: CounterpartyPickerProps) {
    const oneblock = useOneblock();
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<Profile[]>([]);
    const [selected, setSelected] = React.useState<Profile | null>(null);
    const [searching, setSearching] = React.useState(false);
    const [hasSearched, setHasSearched] = React.useState(false);

    React.useEffect(() => {
        const normalized = query.trim();
        if (!oneblock || normalized.length < 2 || selected?.name === normalized) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            setSearching(true);
            setHasSearched(false);
            try {
                const profileId = normalized.replace(/^@/, '');
                const [byName, byId] = await Promise.all([
                    oneblock.searchProfilesByName(normalized),
                    oneblock.getProfile(profileId),
                ]);
                if (!cancelled) {
                    const merged = [...byId, ...byName];
                    const unique = new Map<string, Profile>();
                    merged.forEach((profile) => unique.set(profile.owner.toString(), profile));
                    setResults(
                        Array.from(unique.values())
                            .filter((profile) => profile.owner.toString() !== excludePrincipal)
                            .slice(0, 8),
                    );
                    setHasSearched(true);
                }
            } catch (err) {
                if (!cancelled) {
                    setResults([]);
                    setHasSearched(true);
                }
                console.error('Unable to search profiles', err);
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [excludePrincipal, oneblock, query, selected]);

    const chooseProfile = (profile: Profile) => {
        setSelected(profile);
        setQuery(profile.name);
        setResults([]);
        setHasSearched(false);
        onChange(profile.owner.toString());
    };

    const clearSelection = () => {
        setSelected(null);
        setQuery('');
        setResults([]);
        setHasSearched(false);
        onChange('');
    };

    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>

            {selected && value ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{selected.name}</p>
                        <p className="truncate text-xs text-slate-500">@{selected.id} · {truncate(value)}</p>
                    </div>
                    <button
                        type="button"
                        onClick={clearSelection}
                        className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                        Change
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => {
                            setSelected(null);
                            setQuery(event.target.value);
                            setHasSearched(false);
                            if (value) onChange('');
                        }}
                        placeholder="Search a person, business, or @profile"
                        autoComplete="off"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
                    {searching && (
                        <span className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-600" aria-label="Searching" />
                    )}

                    {results.length > 0 && (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                            {results.map((profile) => (
                                <button
                                    key={profile.owner.toString()}
                                    type="button"
                                    onClick={() => chooseProfile(profile)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50"
                                >
                                    {profile.pfp ? (
                                        <img src={profile.pfp} alt="" className="h-9 w-9 rounded-full bg-slate-100 object-cover" />
                                    ) : (
                                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                                            {profile.name.slice(0, 1).toUpperCase() || '?'}
                                        </span>
                                    )}
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-semibold text-slate-900">{profile.name}</span>
                                        <span className="block truncate text-xs text-slate-500">@{profile.id}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {!searching && hasSearched && results.length === 0 && (
                        <p className="mt-1 text-xs text-slate-500">No matching profile. Try another name or @profile, or use the advanced Principal option below.</p>
                    )}
                </div>
            )}

            <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-slate-600">Advanced: enter Principal directly</summary>
                <input
                    value={value}
                    onChange={(event) => {
                        setSelected(null);
                        onChange(event.target.value.trim());
                    }}
                    placeholder="aaaaa-aa…"
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-800 outline-none focus:border-cyan-500"
                />
            </details>
        </div>
    );
}
