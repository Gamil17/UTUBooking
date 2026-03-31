'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

const COUNTRIES = [
  { code: 'SA', name: 'Saudi Arabia'         },
  { code: 'DZ', name: 'Algeria'              },
  { code: 'AO', name: 'Angola'               },
  { code: 'AR', name: 'Argentina'            },
  { code: 'AU', name: 'Australia'            },
  { code: 'BH', name: 'Bahrain'              },
  { code: 'BD', name: 'Bangladesh'           },
  { code: 'BW', name: 'Botswana'             },
  { code: 'BR', name: 'Brazil'               },
  { code: 'CM', name: 'Cameroon'             },
  { code: 'CA', name: 'Canada'               },
  { code: 'CL', name: 'Chile'                },
  { code: 'CN', name: 'China'                },
  { code: 'CO', name: 'Colombia'             },
  { code: 'CD', name: 'Congo, Dem Rep of'    },
  { code: 'CI', name: "Cote d'Ivoire"        },
  { code: 'EG', name: 'Egypt'                },
  { code: 'ET', name: 'Ethiopia'             },
  { code: 'FR', name: 'France'               },
  { code: 'GA', name: 'Gabon'                },
  { code: 'DE', name: 'Germany'              },
  { code: 'GH', name: 'Ghana'                },
  { code: 'HK', name: 'Hong Kong'            },
  { code: 'IN', name: 'India'                },
  { code: 'ID', name: 'Indonesia'            },
  { code: 'IQ', name: 'Iraq'                 },
  { code: 'IE', name: 'Ireland'              },
  { code: 'IT', name: 'Italy'                },
  { code: 'JP', name: 'Japan'                },
  { code: 'JO', name: 'Jordan'               },
  { code: 'KE', name: 'Kenya'                },
  { code: 'KW', name: 'Kuwait'               },
  { code: 'LB', name: 'Lebanon'              },
  { code: 'LY', name: 'Libya'                },
  { code: 'MO', name: 'Macao'                },
  { code: 'MY', name: 'Malaysia'             },
  { code: 'ML', name: 'Mali'                 },
  { code: 'MU', name: 'Mauritius'            },
  { code: 'MX', name: 'Mexico'               },
  { code: 'MA', name: 'Morocco'              },
  { code: 'MZ', name: 'Mozambique'           },
  { code: 'NA', name: 'Namibia'              },
  { code: 'NL', name: 'Netherlands'          },
  { code: 'NZ', name: 'New Zealand'          },
  { code: 'NG', name: 'Nigeria'              },
  { code: 'NO', name: 'Norway'               },
  { code: 'OM', name: 'Oman'                 },
  { code: 'PK', name: 'Pakistan'             },
  { code: 'PH', name: 'Philippines'          },
  { code: 'PL', name: 'Poland'               },
  { code: 'PT', name: 'Portugal'             },
  { code: 'QA', name: 'Qatar'                },
  { code: 'RU', name: 'Russia'               },
  { code: 'RW', name: 'Rwanda'               },
  { code: 'SN', name: 'Senegal'              },
  { code: 'SG', name: 'Singapore'            },
  { code: 'ZA', name: 'South Africa'         },
  { code: 'KR', name: 'South Korea'          },
  { code: 'ES', name: 'Spain'                },
  { code: 'LK', name: 'Sri Lanka'            },
  { code: 'SE', name: 'Sweden'               },
  { code: 'CH', name: 'Switzerland'          },
  { code: 'TW', name: 'Taiwan'               },
  { code: 'TZ', name: 'Tanzania'             },
  { code: 'TH', name: 'Thailand'             },
  { code: 'TN', name: 'Tunisia'              },
  { code: 'TR', name: 'Turkey'               },
  { code: 'UG', name: 'Uganda'               },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom'       },
  { code: 'US', name: 'United States'        },
  { code: 'VN', name: 'Vietnam'              },
  { code: 'YE', name: 'Yemen'                },
  { code: 'ZM', name: 'Zambia'               },
  { code: 'ZW', name: 'Zimbabwe'             },
];

const STORAGE_KEY = 'utu_country';
const DEFAULT = COUNTRIES[0]; // Saudi Arabia

/** Returns a flagcdn.com 20×15 image for a given ISO 3166-1 alpha-2 code */
function FlagImg({ code, className }: { code: string; className?: string }) {
  const lc = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/20x15/${lc}.png`}
      srcSet={`https://flagcdn.com/40x30/${lc}.png 2x`}
      width={20}
      height={15}
      alt={code}
      className={className}
      loading="lazy"
    />
  );
}

export default function CountrySelector() {
  const [selected, setSelected] = useState(DEFAULT);
  const [isOpen, setIsOpen]     = useState(false);
  const [search, setSearch]     = useState('');
  const [mounted, setMounted]   = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const found = COUNTRIES.find((c) => c.code === saved);
      if (found) setSelected(found);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
      setSearch('');
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleSelect = useCallback((country: typeof DEFAULT) => {
    setSelected(country);
    localStorage.setItem(STORAGE_KEY, country.code);
    setIsOpen(false);
  }, []);

  const filtered = search.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  const modal = isOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 pt-12 pb-4 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Select country or region"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Country/Region</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 border-2 border-emerald-500 rounded-xl px-3 py-2">
            <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto px-4 py-3">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No results found</p>
          ) : (
            <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
              {filtered.map((country) => {
                const isSel = country.code === selected.code;
                return (
                  <button
                    key={country.code}
                    onClick={() => handleSelect(country)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                      isSel ? 'text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <FlagImg code={country.code} className="shrink-0 rounded-sm shadow-sm" />
                    <span className="flex-1 truncate">{country.name}</span>
                    {isSel && (
                      <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-emerald-200 hover:text-white transition-colors text-sm font-medium px-2 py-1.5 rounded-lg hover:bg-white/10"
        aria-label="Select country or region"
      >
        <FlagImg code={selected.code} className="rounded-sm shadow-sm opacity-90" />
        <span className="text-xs font-semibold">{selected.code}</span>
      </button>

      {mounted && createPortal(modal, document.body)}
    </>
  );
}
