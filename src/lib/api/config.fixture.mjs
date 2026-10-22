// Public contract fixture from lumenrise-api db24056; never used as runtime defaults.
export const configuration = {
  "version": 1,
  "auth": {
    "appId": "test-app"
  },
  "network": {
    "default": "testnet",
    "header": "X-Stellar-Network",
    "supported": [
      "testnet",
      "public"
    ],
    "configurations": {
      "testnet": {
        "network": "testnet",
        "rpcUrl": "https://rpc.example/testnet",
        "horizonUrl": "https://horizon.example/testnet",
        "networkPassphrase": "Test SDF Network ; September 2015",
        "factoryContractId": "CD63E3VCNGZGC66ZUTCZDV2YLIBMMFOIFESPM25J5REMU7VM6LNF4B7X",
        "homeDomain": "testnet.example.com",
        "launchConfigured": true
      },
      "public": {
        "network": "public",
        "rpcUrl": "https://rpc.example/public",
        "horizonUrl": "https://horizon.example/public",
        "networkPassphrase": "Public Global Stellar Network ; September 2015",
        "factoryContractId": "CD63E3VCNGZGC66ZUTCZDV2YLIBMMFOIFESPM25J5REMU7VM6LNF4B7X",
        "homeDomain": "public.example.com",
        "launchConfigured": true
      }
    }
  },
  "features": {
    "registration": true,
    "imageUploads": true,
    "githubConnection": false,
    "xConnection": false
  },
  "uploads": {
    "avatar": {
      "maxBytes": 5242880
    },
    "tokenImage": {
      "maxBytes": 5242880
    },
    "teamImage": {
      "maxBytes": 5242880
    }
  },
  "rules": {
    "images": {
      "formats": [
        "jpeg",
        "png",
        "webp"
      ],
      "mimeTypes": [
        "image/jpeg",
        "image/png",
        "image/webp"
      ],
      "minWidth": 128,
      "minHeight": 128,
      "maxInputPixels": 20000000,
      "outputWidth": 512,
      "outputHeight": 512,
      "avatar": {
        "outputFormat": "webp",
        "fit": "cover"
      },
      "token": {
        "outputFormat": "png",
        "fit": "contain",
        "allowAnimated": false
      }
    },
    "profile": {
      "nameMinLength": 1,
      "nameMaxLength": 80,
      "walletRequired": true
    },
    "team": {
      "maxMembers": 6,
      "nameMinLength": 1,
      "nameMaxLength": 80,
      "roleMinLength": 1,
      "roleMaxLength": 80,
      "searchMinLength": 2,
      "searchMaxLength": 80,
      "searchLimit": 20,
      "externalXAccountRequired": true
    },
    "projectLinks": {
      "maxLength": 2048,
      "protocols": [
        "https:"
      ],
      "allowCredentials": false,
      "requireDottedHostname": true,
      "websiteRequired": false,
      "xAccountRequired": false
    },
    "launches": {
      "minLimit": 1,
      "defaultLimit": 20,
      "maxLimit": 100,
      "minPage": 1,
      "maxPage": 100000,
      "searchMaxLength": 100,
      "defaultCategory": "all",
      "categories": [
        "all",
        "bonding-curve",
        "auction",
        "pre-sale"
      ],
      "defaultSort": "newest",
      "sorts": [
        "newest",
        "name",
        "symbol",
        "trending",
        "topVolume",
        "almostGraduated",
        "participants",
        "figure",
        "date",
        "phase",
        "category"
      ],
      "defaultDirection": "desc",
      "directions": [
        "asc",
        "desc"
      ],
      "pairRequiredSorts": [
        "topVolume",
        "figure"
      ],
      "amountScale": 7,
      "priceScale": 7
    },
    "trades": {
      "minLimit": 1,
      "defaultLimit": 20,
      "maxLimit": 100,
      "cursorMaxLength": 512,
      "sides": [
        "buy",
        "sell"
      ]
    },
    "holders": {
      "minLimit": 1,
      "defaultLimit": 20,
      "maxLimit": 100,
      "cursorMaxLength": 512
    },
    "chart": {
      "timeframes": [
        "1m",
        "5m",
        "15m",
        "45m",
        "1h",
        "4h",
        "1d",
        "1w",
        "1M",
        "3M",
        "6M",
        "1y"
      ],
      "defaultTimeframes": [
        "1h",
        "1d",
        "1w",
        "1M",
        "3M",
        "6M",
        "1y"
      ],
      "minLimit": 1,
      "defaultLimit": 1000,
      "maxLimit": 1000,
      "maxTimeframes": 12,
      "kinds": [
        "sampled"
      ],
      "timezone": "UTC",
      "allowFutureTo": false,
      "requireFromBeforeTo": true,
      "legacyRanges": [
        "1D",
        "1W",
        "1M",
        "3M",
        "ALL"
      ],
      "defaultLegacyRange": "1D",
      "rangeExclusiveParameters": [
        "timeframes",
        "from",
        "to",
        "limit"
      ]
    },
    "stellar": {
      "operations": {
        "minLimit": 1,
        "defaultLimit": 50,
        "maxLimit": 200,
        "defaultOrder": "desc",
        "orders": [
          "asc",
          "desc"
        ],
        "cursorPattern": "^\\d{1,40}$"
      },
      "sorobanEvidence": {
        "minLimit": 1,
        "defaultLimit": 50,
        "maxLimit": 100,
        "cursorPattern": "^[a-fA-F0-9]{24}$"
      }
    },
    "refresh": {
      "manualIntervalMs": 900000,
      "githubSyncIntervalMs": 900000,
      "xSyncIntervalMs": 2592000000
    },
    "developerApiKeys": {
      "labelMinLength": 1,
      "labelMaxLength": 80,
      "maxActive": 10,
      "ttlMs": 7776000000,
      "windowMs": 60000,
      "windowLimit": 60,
      "listLimit": 100
    },
    "policies": {
      "keyPattern": "^[a-z][a-z0-9-]{2,63}$",
      "minVersion": 1,
      "dimensions": [
        "developer",
        "social",
        "stellar"
      ],
      "matches": [
        "all",
        "any"
      ],
      "minRules": 1,
      "maxRules": 3,
      "uniqueDimensions": true,
      "minScore": 0,
      "maxScore": 100,
      "minAgeSeconds": 60,
      "maxAgeSeconds": 31536000,
      "listLimit": 100
    }
  }
};
