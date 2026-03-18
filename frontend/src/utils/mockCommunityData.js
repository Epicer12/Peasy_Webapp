/**
 * Mock data for the Community Hub development.
 * This structure is designed to be easily replaceable by backend API calls later.
 */

export const mockBuilds = [
    {
        id: 'build-1',
        userName: 'SiliconSam',
        buildName: 'The Neon Wraith',
        story: 'This build was inspired by the cyberpunk aesthetic of 2077. I wanted something that felt like it belonged in a high-tech back alley in Night City. It took me 3 months to source all the custom cabling.',
        image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=1000&auto=format&fit=crop',
        likes: 124,
        shares: 45,
        createdAt: '2024-03-01T10:00:00Z',
        components: {
            gpu: 'RTX 4090 FE',
            cpu: 'Intel Core i9-14900K',
            ram: '64GB DDR5 6000MHz',
            motherboard: 'ASUS ROG Maximus Z790',
            storage: '4TB NVMe Gen5',
            case: 'Lian Li O11 Dynamic EVO'
        }
    },
    {
        id: 'build-2',
        userName: 'HardwareHacker',
        buildName: 'Obsidian Prime',
        story: 'A blackout build with zero RGB. Focus was entirely on thermal performance and silence. The goal was to have a beast of a machine that you can barely hear even under full load.',
        image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=1000&auto=format&fit=crop',
        likes: 89,
        shares: 12,
        createdAt: '2024-03-05T14:30:00Z',
        components: {
            gpu: 'ProArt RTX 4080 Super',
            cpu: 'AMD Ryzen 9 7950X3D',
            ram: '32GB DDR5 6400MHz',
            motherboard: 'ProArt X670E-CREATOR WIFI',
            storage: '2TB NVMe Gen4',
            case: 'Fractal Design North'
        }
    },
    {
        id: 'build-3',
        userName: 'CodeCooler',
        buildName: 'Winter Spirit',
        story: 'Clean, white, and elegant. This build sits on my desk and motivates me to work every day. I used custom white sleeves for every single cable and even painted the fan frames.',
        image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?q=80&w=1000&auto=format&fit=crop',
        likes: 210,
        shares: 67,
        createdAt: '2024-03-06T09:15:00Z',
        components: {
            gpu: 'Vision OC RTX 3070',
            cpu: 'Intel Core i7-13700K',
            ram: '32GB Corsair Vengeance RGB White',
            motherboard: 'Gigabyte Z790 AERO G',
            storage: '1TB NVMe',
            case: 'NZXT H9 Flow White'
        }
    }
];

export const mockUserBuilds = [
    {
        id: 'my-build-1',
        buildName: 'My First Rig',
        status: 'published',
        likes: 12,
        createdAt: '2024-02-15T12:00:00Z'
    }
];
