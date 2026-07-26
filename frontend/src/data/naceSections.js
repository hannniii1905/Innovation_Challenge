// NACE Rev. 2 hierarchy (sections A-H) for the Financing Portal's
// nature-of-business cascade. Divisions are 2-digit NACE codes; groups
// are 3-digit codes. Data verified against Eurostat listings.
export const NACE_SECTIONS = [
  {
    code: "A",
    label: "Agriculture, forestry and fishing",
    divisions: [
      {
        code: "01",
        label: "Crop and animal production, hunting and related service activities",
        groups: [
          { code: "011", label: "Growing of non-perennial crops" },
          { code: "012", label: "Growing of perennial crops" },
          { code: "013", label: "Plant propagation" },
          { code: "014", label: "Animal production" },
          { code: "015", label: "Mixed farming" },
          { code: "016", label: "Support activities to agriculture and post-harvest crop activities" },
          { code: "017", label: "Hunting, trapping and related service activities" },
        ],
      },
      {
        code: "02",
        label: "Forestry and logging",
        groups: [
          { code: "021", label: "Silviculture and other forestry activities" },
          { code: "022", label: "Logging" },
          { code: "023", label: "Gathering of wild growing non-wood products" },
          { code: "024", label: "Support services to forestry" },
        ],
      },
      {
        code: "03",
        label: "Fishing and aquaculture",
        groups: [
          { code: "031", label: "Fishing" },
          { code: "032", label: "Aquaculture" },
        ],
      },
    ],
  },
  {
    code: "B",
    label: "Mining and quarrying",
    divisions: [
      {
        code: "05",
        label: "Mining of coal and lignite",
        groups: [
          { code: "051", label: "Mining of hard coal" },
          { code: "052", label: "Mining of lignite" },
        ],
      },
      {
        code: "06",
        label: "Extraction of crude petroleum and natural gas",
        groups: [
          { code: "061", label: "Extraction of crude petroleum" },
          { code: "062", label: "Extraction of natural gas" },
        ],
      },
      {
        code: "07",
        label: "Mining of metal ores",
        groups: [
          { code: "071", label: "Mining of iron ores" },
          { code: "072", label: "Mining of non-ferrous metal ores" },
        ],
      },
      {
        code: "08",
        label: "Other mining and quarrying",
        groups: [
          { code: "081", label: "Quarrying of stone, sand and clay" },
          { code: "089", label: "Mining and quarrying n.e.c." },
        ],
      },
      {
        code: "09",
        label: "Mining support service activities",
        groups: [
          { code: "091", label: "Support activities for petroleum and natural gas extraction" },
          { code: "099", label: "Support activities for other mining and quarrying" },
        ],
      },
    ],
  },
  {
    code: "C",
    label: "Manufacturing",
    divisions: [
      {
        code: "10",
        label: "Manufacture of food products",
        groups: [
          { code: "101", label: "Processing and preserving of meat and production of meat products" },
          { code: "102", label: "Processing and preserving of fish, crustaceans and molluscs" },
          { code: "103", label: "Processing and preserving of fruit and vegetables" },
          { code: "104", label: "Manufacture of vegetable and animal oils and fats" },
          { code: "105", label: "Manufacture of dairy products" },
          { code: "106", label: "Manufacture of grain mill products, starches and starch products" },
          { code: "107", label: "Manufacture of bakery and farinaceous products" },
          { code: "108", label: "Manufacture of other food products" },
          { code: "109", label: "Manufacture of prepared animal feeds" },
        ],
      },
      {
        code: "11",
        label: "Manufacture of beverages",
        groups: [
          { code: "110", label: "Manufacture of beverages" },
        ],
      },
      {
        code: "12",
        label: "Manufacture of tobacco products",
        groups: [
          { code: "120", label: "Manufacture of tobacco products" },
        ],
      },
      {
        code: "13",
        label: "Manufacture of textiles",
        groups: [
          { code: "131", label: "Preparation and spinning of textile fibres" },
          { code: "132", label: "Weaving of textiles" },
          { code: "133", label: "Finishing of textiles" },
          { code: "139", label: "Manufacture of other textiles" },
        ],
      },
      {
        code: "14",
        label: "Manufacture of wearing apparel",
        groups: [
          { code: "141", label: "Manufacture of wearing apparel, except fur apparel" },
          { code: "142", label: "Manufacture of articles of fur" },
          { code: "143", label: "Manufacture of knitted and crocheted apparel" },
        ],
      },
      {
        code: "15",
        label: "Manufacture of leather and related products",
        groups: [
          { code: "151", label: "Tanning and dressing of leather; luggage, handbags, saddlery; fur" },
          { code: "152", label: "Manufacture of footwear" },
        ],
      },
      {
        code: "16",
        label: "Manufacture of wood and of products of wood and cork, except furniture",
        groups: [
          { code: "161", label: "Sawmilling and planing of wood" },
          { code: "162", label: "Manufacture of products of wood, cork, straw and plaiting materials" },
        ],
      },
      {
        code: "17",
        label: "Manufacture of paper and paper products",
        groups: [
          { code: "171", label: "Manufacture of pulp, paper and paperboard" },
          { code: "172", label: "Manufacture of articles of paper and paperboard" },
        ],
      },
      {
        code: "18",
        label: "Printing and reproduction of recorded media",
        groups: [
          { code: "181", label: "Printing and service activities related to printing" },
          { code: "182", label: "Reproduction of recorded media" },
        ],
      },
      {
        code: "19",
        label: "Manufacture of coke and refined petroleum products",
        groups: [
          { code: "191", label: "Manufacture of coke oven products" },
          { code: "192", label: "Manufacture of refined petroleum products" },
        ],
      },
      {
        code: "20",
        label: "Manufacture of chemicals and chemical products",
        groups: [
          { code: "201", label: "Manufacture of basic chemicals, fertilisers, plastics, synthetic rubber" },
          { code: "202", label: "Manufacture of pesticides and other agrochemical products" },
          { code: "203", label: "Manufacture of paints, varnishes, coatings, printing ink and mastics" },
          { code: "204", label: "Manufacture of soap, detergents, cleaning preparations and perfumes" },
          { code: "205", label: "Manufacture of other chemical products" },
          { code: "206", label: "Manufacture of man-made fibres" },
        ],
      },
      {
        code: "21",
        label: "Manufacture of basic pharmaceutical products and preparations",
        groups: [
          { code: "211", label: "Manufacture of basic pharmaceutical products" },
          { code: "212", label: "Manufacture of pharmaceutical preparations" },
        ],
      },
      {
        code: "22",
        label: "Manufacture of rubber and plastic products",
        groups: [
          { code: "221", label: "Manufacture of rubber products" },
          { code: "222", label: "Manufacture of plastics products" },
        ],
      },
      {
        code: "23",
        label: "Manufacture of other non-metallic mineral products",
        groups: [
          { code: "231", label: "Manufacture of glass and glass products" },
          { code: "232", label: "Manufacture of refractory products" },
          { code: "233", label: "Manufacture of clay building materials" },
          { code: "234", label: "Manufacture of other porcelain and ceramic products" },
          { code: "235", label: "Manufacture of cement, lime and plaster" },
          { code: "236", label: "Manufacture of articles of concrete, cement and plaster" },
          { code: "237", label: "Cutting, shaping and finishing of stone" },
          { code: "239", label: "Manufacture of abrasive and non-metallic mineral products n.e.c." },
        ],
      },
      {
        code: "24",
        label: "Manufacture of basic metals",
        groups: [
          { code: "241", label: "Manufacture of basic iron and steel and of ferro-alloys" },
          { code: "242", label: "Manufacture of tubes, pipes, hollow profiles and fittings, of steel" },
          { code: "243", label: "Manufacture of other products of first processing of steel" },
          { code: "244", label: "Manufacture of basic precious and other non-ferrous metals" },
          { code: "245", label: "Casting of metals" },
        ],
      },
      {
        code: "25",
        label: "Manufacture of fabricated metal products, except machinery and equipment",
        groups: [
          { code: "251", label: "Manufacture of structural metal products" },
          { code: "252", label: "Manufacture of tanks, reservoirs and containers of metal" },
          { code: "253", label: "Manufacture of steam generators, except central heating boilers" },
          { code: "254", label: "Manufacture of weapons and ammunition" },
          { code: "255", label: "Forging, pressing, stamping and roll-forming of metal; powder metallurgy" },
          { code: "256", label: "Treatment and coating of metals; machining" },
          { code: "257", label: "Manufacture of cutlery, tools and general hardware" },
          { code: "259", label: "Manufacture of other fabricated metal products" },
        ],
      },
      {
        code: "26",
        label: "Manufacture of computer, electronic and optical products",
        groups: [
          { code: "261", label: "Manufacture of electronic components and boards" },
          { code: "262", label: "Manufacture of computers and peripheral equipment" },
          { code: "263", label: "Manufacture of communication equipment" },
          { code: "264", label: "Manufacture of consumer electronics" },
          { code: "265", label: "Instruments for measuring, testing and navigation; watches and clocks" },
          { code: "266", label: "Manufacture of irradiation, electromedical and electrotherapeutic equipment" },
          { code: "267", label: "Manufacture of optical instruments and photographic equipment" },
          { code: "268", label: "Manufacture of magnetic and optical media" },
        ],
      },
      {
        code: "27",
        label: "Manufacture of electrical equipment",
        groups: [
          { code: "271", label: "Electric motors, generators, transformers and distribution apparatus" },
          { code: "272", label: "Manufacture of batteries and accumulators" },
          { code: "273", label: "Manufacture of wiring and wiring devices" },
          { code: "274", label: "Manufacture of electric lighting equipment" },
          { code: "275", label: "Manufacture of domestic appliances" },
          { code: "279", label: "Manufacture of other electrical equipment" },
        ],
      },
      {
        code: "28",
        label: "Manufacture of machinery and equipment n.e.c.",
        groups: [
          { code: "281", label: "Manufacture of general-purpose machinery" },
          { code: "282", label: "Manufacture of other general-purpose machinery" },
          { code: "283", label: "Manufacture of agricultural and forestry machinery" },
          { code: "284", label: "Manufacture of metal forming machinery and machine tools" },
          { code: "289", label: "Manufacture of other special-purpose machinery" },
        ],
      },
      {
        code: "29",
        label: "Manufacture of motor vehicles, trailers and semi-trailers",
        groups: [
          { code: "291", label: "Manufacture of motor vehicles" },
          { code: "292", label: "Manufacture of bodies for motor vehicles; trailers and semi-trailers" },
          { code: "293", label: "Manufacture of parts and accessories for motor vehicles" },
        ],
      },
      {
        code: "30",
        label: "Manufacture of other transport equipment",
        groups: [
          { code: "301", label: "Building of ships and boats" },
          { code: "302", label: "Manufacture of railway locomotives and rolling stock" },
          { code: "303", label: "Manufacture of air and spacecraft and related machinery" },
          { code: "304", label: "Manufacture of military fighting vehicles" },
          { code: "309", label: "Manufacture of transport equipment n.e.c." },
        ],
      },
      {
        code: "31",
        label: "Manufacture of furniture",
        groups: [
          { code: "310", label: "Manufacture of furniture" },
        ],
      },
      {
        code: "32",
        label: "Other manufacturing",
        groups: [
          { code: "321", label: "Manufacture of jewellery, bijouterie and related articles" },
          { code: "322", label: "Manufacture of musical instruments" },
          { code: "323", label: "Manufacture of sports goods" },
          { code: "324", label: "Manufacture of games and toys" },
          { code: "325", label: "Manufacture of medical and dental instruments and supplies" },
          { code: "329", label: "Manufacturing n.e.c." },
        ],
      },
      {
        code: "33",
        label: "Repair and installation of machinery and equipment",
        groups: [
          { code: "331", label: "Repair of fabricated metal products, machinery and equipment" },
          { code: "332", label: "Installation of industrial machinery and equipment" },
        ],
      },
    ],
  },
  {
    code: "D",
    label: "Electricity, gas, steam and air conditioning supply",
    divisions: [
      {
        code: "35",
        label: "Electricity, gas, steam and air conditioning supply",
        groups: [
          { code: "351", label: "Electric power generation, transmission and distribution" },
          { code: "352", label: "Manufacture of gas; distribution of gaseous fuels through mains" },
          { code: "353", label: "Steam and air conditioning supply" },
        ],
      },
    ],
  },
  {
    code: "E",
    label: "Water supply; sewerage, waste management and remediation activities",
    divisions: [
      {
        code: "36",
        label: "Water collection, treatment and supply",
        groups: [
          { code: "360", label: "Water collection, treatment and supply" },
        ],
      },
      {
        code: "37",
        label: "Sewerage",
        groups: [
          { code: "370", label: "Sewerage" },
        ],
      },
      {
        code: "38",
        label: "Waste collection, treatment and disposal; materials recovery",
        groups: [
          { code: "381", label: "Waste collection" },
          { code: "382", label: "Waste treatment and disposal" },
          { code: "383", label: "Materials recovery" },
        ],
      },
      {
        code: "39",
        label: "Remediation activities and other waste management services",
        groups: [
          { code: "390", label: "Remediation activities and other waste management services" },
        ],
      },
    ],
  },
  {
    code: "F",
    label: "Construction",
    divisions: [
      {
        code: "41",
        label: "Construction of buildings",
        groups: [
          { code: "411", label: "Development of building projects" },
          { code: "412", label: "Construction of residential and non-residential buildings" },
        ],
      },
      {
        code: "42",
        label: "Civil engineering",
        groups: [
          { code: "421", label: "Construction of roads and railways" },
          { code: "422", label: "Construction of utility projects" },
          { code: "429", label: "Construction of other civil engineering projects" },
        ],
      },
      {
        code: "43",
        label: "Specialised construction activities",
        groups: [
          { code: "431", label: "Demolition and site preparation" },
          { code: "432", label: "Electrical, plumbing and other construction installation activities" },
          { code: "433", label: "Building completion and finishing" },
          { code: "439", label: "Other specialised construction activities" },
        ],
      },
    ],
  },
  {
    code: "G",
    label: "Wholesale and retail trade; repair of motor vehicles and motorcycles",
    divisions: [
      {
        code: "45",
        label: "Wholesale and retail trade and repair of motor vehicles and motorcycles",
        groups: [
          { code: "451", label: "Sale of motor vehicles" },
          { code: "452", label: "Maintenance and repair of motor vehicles" },
          { code: "453", label: "Sale of motor vehicle parts and accessories" },
          { code: "454", label: "Sale, maintenance and repair of motorcycles, parts and accessories" },
        ],
      },
      {
        code: "46",
        label: "Wholesale trade, except of motor vehicles and motorcycles",
        groups: [
          { code: "461", label: "Wholesale on a fee or contract basis" },
          { code: "462", label: "Wholesale of agricultural raw materials and live animals" },
          { code: "463", label: "Wholesale of food, beverages and tobacco" },
          { code: "464", label: "Wholesale of household goods" },
          { code: "465", label: "Wholesale of information and communication equipment" },
          { code: "466", label: "Wholesale of other machinery, equipment and supplies" },
          { code: "467", label: "Other specialised wholesale" },
          { code: "469", label: "Non-specialised wholesale trade" },
        ],
      },
      {
        code: "47",
        label: "Retail trade, except of motor vehicles and motorcycles",
        groups: [
          { code: "471", label: "Retail sale in non-specialised stores" },
          { code: "472", label: "Retail sale of food, beverages and tobacco in specialised stores" },
          { code: "473", label: "Retail sale of automotive fuel in specialised stores" },
          { code: "474", label: "Retail sale of information and communication equipment (specialised)" },
          { code: "475", label: "Retail sale of other household equipment in specialised stores" },
          { code: "476", label: "Retail sale of cultural and recreation goods in specialised stores" },
          { code: "477", label: "Retail sale of other goods in specialised stores" },
          { code: "478", label: "Retail sale via stalls and markets" },
          { code: "479", label: "Retail trade not in stores, stalls or markets" },
        ],
      },
    ],
  },
  {
    code: "H",
    label: "Transportation and storage",
    divisions: [
      {
        code: "49",
        label: "Land transport and transport via pipelines",
        groups: [
          { code: "491", label: "Passenger rail transport, interurban" },
          { code: "492", label: "Freight rail transport" },
          { code: "493", label: "Other passenger land transport" },
          { code: "494", label: "Freight transport by road and removal services" },
          { code: "495", label: "Transport via pipeline" },
        ],
      },
      {
        code: "50",
        label: "Water transport",
        groups: [
          { code: "501", label: "Sea and coastal passenger water transport" },
          { code: "502", label: "Sea and coastal freight water transport" },
          { code: "503", label: "Inland passenger water transport" },
          { code: "504", label: "Inland freight water transport" },
        ],
      },
      {
        code: "51",
        label: "Air transport",
        groups: [
          { code: "511", label: "Passenger air transport" },
          { code: "512", label: "Freight air transport and space transport" },
        ],
      },
      {
        code: "52",
        label: "Warehousing and support activities for transportation",
        groups: [
          { code: "521", label: "Warehousing and storage" },
          { code: "522", label: "Support activities for transportation" },
        ],
      },
      {
        code: "53",
        label: "Postal and courier activities",
        groups: [
          { code: "531", label: "Postal activities under universal service obligation" },
          { code: "532", label: "Other postal and courier activities" },
        ],
      },
    ],
  },
];
