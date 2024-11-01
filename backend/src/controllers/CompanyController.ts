import { Request, Response } from "express";
import fs from "fs/promises";
import { CONFIG } from "../config/constants";
import { Company } from "../types";

/* ------------------------------------------------------------------------------------------ */
/*                                       Add New Company                                      */
/* ------------------------------------------------------------------------------------------ */

export const addCompany = async (req: any, res: any) => {
    const { company_name, link, fbLink, instaLink } = req.body;

    if (!company_name || !link) {
        return res.status(400).json({
            error: "Company name and link are required",
        });
    }

    try {
        const data = await fs.readFile(CONFIG.DATA_PATHS.COMPANIES, "utf-8");
        const companiesData = JSON.parse(data);

        const companyExists = companiesData.companies.some((company: Company) => company.name.toLowerCase() === company_name.toLowerCase());

        if (companyExists) {
            return res.status(409).json({
                error: "Company already exists",
            });
        }

        companiesData.companies.push({
            name: company_name,
            link: link,
            fbLink: fbLink,
            instaLink: instaLink,
        });

        await fs.writeFile(CONFIG.DATA_PATHS.COMPANIES, JSON.stringify(companiesData, null, 2));

        res.status(201).json({
            status: "Company added successfully; bots will visit after completing one lifecycle.",
        });
    } catch (error) {
        console.error("Error adding company:", error);
        res.status(500).json({
            error: "An error occurred while adding the company",
        });
    }
}