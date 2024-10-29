const apiUrl: string | undefined = process.env.REACT_APP_API_URL;

if (!apiUrl) {
  throw new Error("API URL is not defined");
}

interface AddCompanyFormData {
  company_name: string;
  company_link: string;
}

export const CompaniesClient = {
  /* -------------------------------------------------------------------------------------------- */
  /*                                        Add New Company                                       */
  /* -------------------------------------------------------------------------------------------- */
  addNewCompany: async (formData: AddCompanyFormData) => {
    try {
      const response = await fetch(`${apiUrl}/company/add-company`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add company");
      }

      return await response.json();
    } catch (error) {
      console.error("Error adding company:", error);
      throw error;
    }
  },
};
