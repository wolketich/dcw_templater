const DEFAULTS = {
  logoPath: "assets/expert-windows-logo.png",

  app: {
    title: "Declaration Generator",
    description: "Fill the fields, pick a signature, then create the PDF."
  },

  documentTitle: "Declaration of Completed Works",

  placeholders: {
    homeowner: "Homeowner Full Name",
    address: "Full Property Address",
    subjectAddress: "Property Address",
    shortDate: "DD/MM/YYYY",
    longDate: "Month DDth, YYYY",
    workItem: "Supply & installation of uPVC triple glazed windows"
  },

  company: {
    name: "Expert Windows Ltd",
    address: "Unit 3-4 John F Kennedy Park, Dublin 12, D12 FR82",
    phone: "01 233 0692",
    email: "info@expertwindows.ie"
  },

  text: {
    worksIntro: "The completed works include:",
    qualityParagraph: "Our team has carried out the installation in line with the agreed specifications and to the highest quality standards. We trust you are satisfied with the outcome.",
    aftercareParagraph: "Please don’t hesitate to contact us should you have any questions or require aftercare assistance.",
    thankYouParagraph: "Thank you for choosing Expert Windows Ltd. We appreciate your business.",
    warmRegards: "Warm Regards,"
  },

  defaultWorks: [],

  workTemplates: [
    {
      id: "casement",
      label: "uPVC Casement Windows",
      description: "Supply & installation of uPVC Casement Windows",
      group: "Windows"
    },
    {
      id: "residential-door",
      label: "uPVC Residential Doors",
      description: "Supply & installation of uPVC Residential Doors",
      group: "Doors"
    },
    {
      id: "patio-door",
      label: "uPVC Patio Door",
      description: "Supply & installation of uPVC Patio Door",
      group: "Doors"
    },
    {
      id: "composite",
      label: "Composite Door",
      description: "Supply & installation of a Single Composite Door",
      group: "Configured"
    },
    {
      id: "tilt-turn",
      label: "uPVC Tilt and Turn Windows",
      description: "Supply & installation of uPVC Tilt and Turn Windows",
      group: "Windows"
    },
    {
      id: "custom",
      label: "Custom",
      description: "",
      group: "Free form"
    }
  ],

  bulk: {
    maxRows: 25,
    templateItemCount: 5,
    baseHeaders: ["letter_date", "completion_date", "homeowner", "address"]
  },

  signatures: [
    {
      label: "No signature",
      path: "",
      name: "",
      role: ""
    },
    {
      label: "Valeriu Sapteboi, Sales Manager",
      path: "assets/signature-valeriu.png",
      name: "Valeriu Sapteboi",
      role: "Sales Manager"
    },
    {
      label: "Vladislav Cernega, Customer Relations",
      path: "assets/signature-vladislav.png",
      name: "Vladislav Cernega",
      role: "Sales & Customer Relations"
    },
    {
      label: "Daniela Stog, Sales Assistant",
      path: "assets/signature-dana.png",
      name: "Daniela Stog",
      role: "Sales Assistant"
    }
  ]
};
