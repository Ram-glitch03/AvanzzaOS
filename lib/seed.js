// Dataset DEMO (genérico, sin datos reales). Se usa solo cuando corre en Vercel sin Supabase.
module.exports = {
  "settings": {
    "businessName": "Avanzza OS — Demo",
    "currency": "USD",
    "hourlyRate": 30,
    "vaultPath": "/Users/Sebastian/Library/Mobile Documents/iCloud~md~obsidian/Documents/Avanzza",
    "taxRate": 16
  },
  "team": [
    {
      "id": "tm1",
      "name": "Sebastián",
      "role": "Fundador / Operación",
      "email": ""
    },
    {
      "id": "tm2",
      "name": "Responsable ejemplo",
      "role": "Colaborador",
      "email": ""
    }
  ],
  "clients": [
    {
      "id": "cl1",
      "name": "Cliente A",
      "status": "activo",
      "notes": "",
      "monthlyRetainer": 0,
      "contact": ""
    },
    {
      "id": "cl2",
      "name": "Cliente B",
      "status": "ejemplo",
      "notes": "",
      "monthlyRetainer": 1500,
      "contact": ""
    }
  ],
  "agents": [
    {
      "id": "ag1",
      "name": "Claude Code (Fable 5)",
      "platform": "Claude Code",
      "model": "claude-fable-5",
      "purpose": "Desarrollo, automatización y operación general",
      "tokenCostMonthly": 0,
      "runsPerWeek": 20,
      "status": "activo",
      "clientId": "",
      "notes": "Detectado en tu entorno. Si pagas por API, pon aquí el gasto mensual en tokens.",
      "subscriptionId": "su1"
    },
    {
      "id": "ag2",
      "name": "Agente de prospección",
      "platform": "Claude + Explorium",
      "model": "claude-sonnet-5",
      "purpose": "Enriquecimiento de leads y prospección B2B",
      "tokenCostMonthly": 0,
      "runsPerWeek": 0,
      "status": "ejemplo",
      "clientId": "",
      "notes": "Ejemplo — edítalo o bórralo.",
      "subscriptionId": ""
    }
  ],
  "subscriptions": [
    {
      "id": "su1",
      "name": "Claude Max",
      "category": "IA",
      "price": 100,
      "cycle": "mensual",
      "renewalDay": 1,
      "status": "ejemplo",
      "clientId": "",
      "notes": "Ejemplo — ajusta al plan y precio real que pagas.",
      "metered": false
    },
    {
      "id": "su2",
      "name": "Higgsfield",
      "category": "IA / Video",
      "price": 29,
      "cycle": "mensual",
      "renewalDay": 1,
      "status": "ejemplo",
      "clientId": "",
      "notes": "Detectado como conexión activa. Ajusta el precio de tu plan.",
      "metered": false
    },
    {
      "id": "su3",
      "name": "Vercel",
      "category": "Infraestructura",
      "price": 20,
      "cycle": "mensual",
      "renewalDay": 1,
      "status": "ejemplo",
      "clientId": "",
      "notes": "Detectado como conexión activa. Gratis o Pro según tu plan.",
      "metered": false
    },
    {
      "id": "su4",
      "name": "Supabase",
      "category": "Infraestructura",
      "price": 25,
      "cycle": "mensual",
      "renewalDay": 1,
      "status": "ejemplo",
      "clientId": "",
      "notes": "Detectado como conexión activa. Gratis o Pro según tu plan.",
      "metered": false
    },
    {
      "id": "su5",
      "name": "Canva",
      "category": "Diseño",
      "price": 15,
      "cycle": "mensual",
      "renewalDay": 1,
      "status": "ejemplo",
      "clientId": "",
      "notes": "Detectado como conexión activa.",
      "metered": false
    }
  ],
  "usageLog": [
    {
      "id": "ul1",
      "date": "2026-07-05",
      "agentId": "ag1",
      "clientId": "cl1",
      "runs": 8,
      "tokens": 420000,
      "cost": 0,
      "notes": ""
    },
    {
      "id": "ul2",
      "date": "2026-07-08",
      "agentId": "ag1",
      "clientId": "",
      "runs": 12,
      "tokens": 610000,
      "cost": 0,
      "notes": "Operación interna"
    },
    {
      "id": "ul3",
      "date": "2026-07-10",
      "agentId": "ag2",
      "clientId": "cl2",
      "runs": 4,
      "tokens": 150000,
      "cost": 0,
      "notes": "Prospección"
    }
  ],
  "skills": [
    {
      "id": "sk1",
      "name": "ads",
      "uses": 0,
      "minutesSavedPerUse": 45,
      "description": "Creación de anuncios"
    },
    {
      "id": "sk2",
      "name": "beautiful-article",
      "uses": 0,
      "minutesSavedPerUse": 60,
      "description": "Artículos web en HTML de una sola pieza"
    },
    {
      "id": "sk3",
      "name": "brandkit",
      "uses": 0,
      "minutesSavedPerUse": 90,
      "description": "Brand kits e identidad visual premium"
    },
    {
      "id": "sk4",
      "name": "design-taste-frontend",
      "uses": 0,
      "minutesSavedPerUse": 60,
      "description": "Landing pages y portafolios anti-genéricos"
    },
    {
      "id": "sk5",
      "name": "design-taste-frontend-v1",
      "uses": 0,
      "minutesSavedPerUse": 60,
      "description": "Versión 1 del skill de diseño frontend"
    },
    {
      "id": "sk6",
      "name": "full-output-enforcement",
      "uses": 0,
      "minutesSavedPerUse": 15,
      "description": "Fuerza salidas de código completas"
    },
    {
      "id": "sk7",
      "name": "gpt-image-2",
      "uses": 0,
      "minutesSavedPerUse": 30,
      "description": "Generación y edición de imágenes con plantillas"
    },
    {
      "id": "sk8",
      "name": "gpt-taste",
      "uses": 0,
      "minutesSavedPerUse": 45,
      "description": "UX/UI con GSAP y layouts editoriales"
    },
    {
      "id": "sk9",
      "name": "gsap-core",
      "uses": 0,
      "minutesSavedPerUse": 20,
      "description": "Animaciones GSAP básicas"
    },
    {
      "id": "sk10",
      "name": "gsap-frameworks",
      "uses": 0,
      "minutesSavedPerUse": 20,
      "description": "GSAP en Vue/Svelte"
    },
    {
      "id": "sk11",
      "name": "gsap-performance",
      "uses": 0,
      "minutesSavedPerUse": 20,
      "description": "Optimización de animaciones"
    },
    {
      "id": "sk12",
      "name": "gsap-plugins",
      "uses": 0,
      "minutesSavedPerUse": 20,
      "description": "Plugins de GSAP"
    },
    {
      "id": "sk13",
      "name": "gsap-react",
      "uses": 0,
      "minutesSavedPerUse": 20,
      "description": "GSAP en React"
    },
    {
      "id": "sk14",
      "name": "gsap-scrolltrigger",
      "uses": 0,
      "minutesSavedPerUse": 25,
      "description": "Animaciones al hacer scroll"
    },
    {
      "id": "sk15",
      "name": "gsap-skills",
      "uses": 0,
      "minutesSavedPerUse": 20,
      "description": "Paquete de skills GSAP"
    },
    {
      "id": "sk16",
      "name": "gsap-timeline",
      "uses": 0,
      "minutesSavedPerUse": 20,
      "description": "Secuencias y timelines"
    },
    {
      "id": "sk17",
      "name": "gsap-utils",
      "uses": 0,
      "minutesSavedPerUse": 15,
      "description": "Utilidades de GSAP"
    },
    {
      "id": "sk18",
      "name": "high-end-visual-design",
      "uses": 0,
      "minutesSavedPerUse": 60,
      "description": "Diseño web nivel agencia"
    },
    {
      "id": "sk19",
      "name": "huashu-design",
      "uses": 0,
      "minutesSavedPerUse": 60,
      "description": "Prototipos, slides y visualizaciones HTML"
    },
    {
      "id": "sk20",
      "name": "image-to-code",
      "uses": 0,
      "minutesSavedPerUse": 60,
      "description": "De imagen de diseño a código"
    },
    {
      "id": "sk21",
      "name": "imagegen-frontend-mobile",
      "uses": 0,
      "minutesSavedPerUse": 45,
      "description": "Conceptos de apps móviles"
    },
    {
      "id": "sk22",
      "name": "imagegen-frontend-web",
      "uses": 0,
      "minutesSavedPerUse": 45,
      "description": "Referencias visuales de sitios web"
    },
    {
      "id": "sk23",
      "name": "industrial-brutalist-ui",
      "uses": 0,
      "minutesSavedPerUse": 45,
      "description": "Interfaces brutalistas / industriales"
    },
    {
      "id": "sk24",
      "name": "kb-retriever",
      "uses": 0,
      "minutesSavedPerUse": 30,
      "description": "Búsqueda en bases de conocimiento locales"
    },
    {
      "id": "sk25",
      "name": "marp-slides",
      "uses": 0,
      "minutesSavedPerUse": 60,
      "description": "Presentaciones MARP con gráficas"
    },
    {
      "id": "sk26",
      "name": "minimalist-ui",
      "uses": 0,
      "minutesSavedPerUse": 45,
      "description": "Interfaces minimalistas editoriales"
    },
    {
      "id": "sk27",
      "name": "pixel2motion",
      "uses": 0,
      "minutesSavedPerUse": 90,
      "description": "Logo raster → SVG animado"
    },
    {
      "id": "sk28",
      "name": "redesign-existing-projects",
      "uses": 0,
      "minutesSavedPerUse": 90,
      "description": "Rediseño premium de sitios existentes"
    },
    {
      "id": "sk29",
      "name": "stitch-design-taste",
      "uses": 0,
      "minutesSavedPerUse": 30,
      "description": "Design systems para Google Stitch"
    },
    {
      "id": "sk30",
      "name": "transitions-dev",
      "uses": 0,
      "minutesSavedPerUse": 25,
      "description": "Transiciones CSS de producción"
    },
    {
      "id": "sk31",
      "name": "web-design-engineer",
      "uses": 0,
      "minutesSavedPerUse": 60,
      "description": "Artefactos web pulidos (dashboards, decks)"
    },
    {
      "id": "sk32",
      "name": "web-video-presentation",
      "uses": 0,
      "minutesSavedPerUse": 120,
      "description": "Presentaciones web tipo video"
    }
  ],
  "connections": [
    {
      "id": "co1",
      "name": "Supabase",
      "type": "MCP",
      "status": "conectado",
      "linkedTo": "Base de datos y backend",
      "notes": ""
    },
    {
      "id": "co2",
      "name": "Vercel",
      "type": "MCP",
      "status": "conectado",
      "linkedTo": "Deploys y hosting",
      "notes": ""
    },
    {
      "id": "co3",
      "name": "Canva",
      "type": "MCP",
      "status": "conectado",
      "linkedTo": "Diseño",
      "notes": ""
    },
    {
      "id": "co4",
      "name": "Gmail",
      "type": "MCP",
      "status": "conectado",
      "linkedTo": "Correo (avanzzaai@gmail.com)",
      "notes": ""
    },
    {
      "id": "co5",
      "name": "Higgsfield",
      "type": "MCP",
      "status": "conectado",
      "linkedTo": "Generación de imagen/video/audio",
      "notes": ""
    },
    {
      "id": "co6",
      "name": "Explorium",
      "type": "MCP",
      "status": "conectado",
      "linkedTo": "Enriquecimiento de leads B2B",
      "notes": ""
    },
    {
      "id": "co7",
      "name": "Claude in Chrome",
      "type": "Extensión",
      "status": "conectado",
      "linkedTo": "Automatización de navegador",
      "notes": ""
    },
    {
      "id": "co8",
      "name": "Obsidian (vault Avanzza)",
      "type": "Local",
      "status": "conectado",
      "linkedTo": "Notas y contexto del negocio",
      "notes": "Conectado vía carpeta local de iCloud."
    },
    {
      "id": "co9",
      "name": "Notion",
      "type": "MCP",
      "status": "pendiente",
      "linkedTo": "Requiere autorizar en claude.ai",
      "notes": ""
    },
    {
      "id": "co10",
      "name": "HubSpot",
      "type": "MCP",
      "status": "pendiente",
      "linkedTo": "Requiere autorizar en claude.ai",
      "notes": ""
    },
    {
      "id": "co11",
      "name": "Linear",
      "type": "MCP",
      "status": "pendiente",
      "linkedTo": "Requiere autorizar en claude.ai",
      "notes": ""
    }
  ],
  "tasks": [
    {
      "id": "tk1",
      "clientId": "cl1",
      "title": "Enviar propuesta de landing co-branded",
      "assigneeId": "tm1",
      "dueDate": "2026-07-22",
      "priority": "alta",
      "status": "en curso",
      "notes": ""
    },
    {
      "id": "tk2",
      "clientId": "cl1",
      "title": "Definir paleta y tipografía",
      "assigneeId": "tm1",
      "dueDate": "2026-07-25",
      "priority": "media",
      "status": "pendiente",
      "notes": ""
    },
    {
      "id": "tk3",
      "clientId": "cl2",
      "title": "Cargar lista de prospectos",
      "assigneeId": "tm2",
      "dueDate": "2026-07-21",
      "priority": "alta",
      "status": "pendiente",
      "notes": "Ejemplo — edítalo o bórralo"
    },
    {
      "id": "tk4",
      "clientId": "",
      "title": "Terminar de configurar Avanzza OS",
      "assigneeId": "tm1",
      "dueDate": "2026-07-20",
      "priority": "media",
      "status": "en curso",
      "notes": "Llenar datos reales"
    }
  ],
  "invoices": [
    {
      "id": "inv1",
      "clientId": "cl1",
      "concept": "Landing co-branded — anticipo",
      "amount": 15000,
      "issueDate": "2026-07-03",
      "dueDate": "2026-07-18",
      "status": "pendiente"
    },
    {
      "id": "inv2",
      "clientId": "cl2",
      "concept": "Servicio de prospección (ejemplo)",
      "amount": 8000,
      "issueDate": "2026-07-01",
      "dueDate": "2026-07-15",
      "status": "pagada"
    }
  ],
  "expenses": [
    {
      "id": "ex1",
      "concept": "Publicidad / Ads",
      "category": "Marketing",
      "amount": 2000,
      "date": "2026-07-04",
      "recurring": "no",
      "clientId": "cl1"
    },
    {
      "id": "ex2",
      "concept": "Dominio y hosting extra",
      "category": "Infraestructura",
      "amount": 350,
      "date": "2026-07-02",
      "recurring": "no",
      "clientId": ""
    }
  ],
  "projects": [
    {
      "id": "pr1",
      "clientId": "cl1",
      "name": "",
      "budget": 30000,
      "spent": 8000,
      "status": "activo",
      "startDate": "2026-07-01",
      "endDate": ""
    },
    {
      "id": "pr2",
      "clientId": "cl2",
      "name": "Campaña de prospección (ejemplo)",
      "budget": 12000,
      "spent": 3000,
      "status": "activo",
      "startDate": "2026-07-01",
      "endDate": ""
    }
  ],
  "services": [
    {
      "id": "sv1",
      "name": "Landing page con IA",
      "category": "Web",
      "description": "Landing de alto nivel diseñada y desarrollada con IA",
      "hours": 20,
      "hourlyRate": 45,
      "status": "ejemplo",
      "notes": ""
    },
    {
      "id": "sv2",
      "name": "Agente de prospección (setup)",
      "category": "Automatización",
      "description": "Configuración de agente de leads B2B con Explorium",
      "hours": 15,
      "hourlyRate": 45,
      "status": "ejemplo",
      "notes": ""
    },
    {
      "id": "sv3",
      "name": "Automatización de flujo",
      "category": "Automatización",
      "description": "Automatización de un proceso con MCPs/agentes",
      "hours": 12,
      "hourlyRate": 50,
      "status": "ejemplo",
      "notes": ""
    },
    {
      "id": "sv4",
      "name": "Brand kit con IA",
      "category": "Diseño",
      "description": "Identidad visual y sistema de marca premium",
      "hours": 10,
      "hourlyRate": 40,
      "status": "ejemplo",
      "notes": ""
    },
    {
      "id": "sv5",
      "name": "Video con IA (Higgsfield)",
      "category": "Contenido",
      "description": "Video corto generado con IA para redes",
      "hours": 6,
      "hourlyRate": 40,
      "status": "ejemplo",
      "notes": ""
    },
    {
      "id": "sv6",
      "name": "Dashboard / panel a medida",
      "category": "Web",
      "description": "Panel de control tipo Avanzza OS",
      "hours": 25,
      "hourlyRate": 50,
      "status": "ejemplo",
      "notes": ""
    }
  ],
  "packages": [
    {
      "id": "pk1",
      "name": "Arranque digital",
      "description": "Landing + identidad de marca para empezar",
      "discountPct": 10,
      "status": "ejemplo",
      "items": [
        {
          "serviceId": "sv1",
          "qty": 1
        },
        {
          "serviceId": "sv4",
          "qty": 1
        }
      ]
    },
    {
      "id": "pk2",
      "name": "Motor de ventas",
      "description": "Prospección + automatización de seguimiento",
      "discountPct": 10,
      "status": "ejemplo",
      "items": [
        {
          "serviceId": "sv2",
          "qty": 1
        },
        {
          "serviceId": "sv3",
          "qty": 1
        }
      ]
    }
  ],
  "quotes": [
    {
      "id": "qt1",
      "clientId": "cl1",
      "title": "Propuesta landing co-branded",
      "date": "2026-07-23",
      "validUntil": "",
      "status": "borrador",
      "discountPct": 0,
      "taxPct": 16,
      "notes": "Ejemplo — edítala o duplícala.",
      "items": [
        {
          "serviceId": "sv1",
          "description": "Landing page con IA",
          "hours": 20,
          "hourlyRate": 45,
          "qty": 1
        },
        {
          "serviceId": "sv4",
          "description": "Brand kit con IA",
          "hours": 10,
          "hourlyRate": 40,
          "qty": 1
        }
      ]
    }
  ]
};
