import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ASSEMBLY_STEPS = [
    {
        id: 'case_prep',
        title: 'PC CASE PREPARATION',
        component: 'PC CASE',
        warning: {
            type: 'caution',
            text: 'Ensure you have a clean, non-conductive surface to work on. Avoid working on carpets to prevent static electricity build-up.'
        },
        steps: [
            'Unbox your PC case and keep all screws and manuals organized.',
            'Remove the side panels (tempered glass or metal) and store them safely.',
            'Identify the front panel connectors (USB, Audio, Power/Reset SW).',
            'Check for pre-installed standoffs; verify they match your motherboard size (ATX, mATX).',
            'Clear out any internal packaging material or zip ties.',
            'Place the case flat on its side for easier component installation later.',
            'Identify cable routing holes and rubber grommets.',
            'If your case has a PSU shroud, identify the mounting area.',
            'Prepare the I/O shield (if not pre-integrated into the motherboard).'
        ],
        explanation: 'The case is the foundation of your build. Proper preparation ensures you don\'t have to backtrack later, especially regarding standoff placement and cable management routing.',
        proTips: 'Use a magnetic screw tray to keep track of the various small screws; they are easy to lose!',
        commonMistakes: 'Forgetting to install the I/O shield before the motherboard is a classic "rite of passage" mistake that requires disassembly.',
        safetyWarnings: 'Tempered glass panels can shatter if they hit a hard floor corner-first. Handle with extreme care.'
    },
    {
        id: 'psu',
        title: 'POWER SUPPLY INSTALLATION',
        component: 'PSU',
        warning: {
            type: 'critical',
            text: 'NEVER plug the PSU into the wall outlet until the build is completely finished and all internal connections are verified.'
        },
        steps: [
            'Identify the PSU mounting location (usually at the bottom rear).',
            'If using a modular PSU, plug in necessary cables (24-pin, CPU, PCIe, SATA) BEFORE mounting.',
            'Orient the PSU fan to face the ventilation cutout (usually facing downwards).',
            'Slide the PSU into its bracket or cutout.',
            'Align the four screw holes on the back of the case with the PSU.',
            'Secure the PSU using the specific coarse-thread screws provided with the PSU.',
            'Ensure the PSU is seated firmly and doesn\'t rattle.',
            'Route the main cables through the nearest management holes.',
            'Keep unused modular cables in their bag for future upgrades.'
        ],
        explanation: 'The PSU is the heart of the system, converting AC wall power to DC for your components. Installing it early allows for cleaner cable routing.',
        proTips: 'If your case has a bottom filter, ensure the PSU fan faces it to pull in fresh, cool air.',
        commonMistakes: 'Overtightening screws can strip the PSU housing or damage the mounting bracket.',
        safetyWarnings: 'Do not open the PSU casing. It contains capacitors that hold dangerous charges even when unplugged.'
    },
    {
        id: 'mobo_prep',
        title: 'MOTHERBOARD PREPARATION',
        component: 'MOTHERBOARD',
        warning: {
            type: 'caution',
            text: 'Place the motherboard on its anti-static bag or the original box during preparation. NEVER place it directly on a metal surface.'
        },
        steps: [
            'Remove the motherboard from its packaging carefully.',
            'Locate the CPU socket and identify the lever mechanism.',
            'Locate the RAM slots and identify the retention clips.',
            'Locate the M.2 NVMe slots (usually under heatsinks).',
            'Identify the 24-pin power and 8-pin CPU power connectors.',
            'Check the manual for the recommended RAM slot configuration (usually slots 2 & 4).',
            'Identify the fan headers (CPU_FAN, SYS_FAN).',
            'Leave the plastic CPU socket protector in place for now.',
            'Gather the M.2 screws or latches provided with the board.'
        ],
        explanation: 'Preparing the motherboard outside the case is much easier than struggling with tiny screws in a cramped interior. This is where the core components are seated.',
        proTips: 'A well-lit area and a magnifying glass can help identify tiny labels like "PW_SW" or "RESET_SW".',
        commonMistakes: 'Touching the bottom of the motherboard or the gold contact pins can cause static damage.',
        safetyWarnings: 'The edges of motherboard heatsinks and I/O shields can be surprisingly sharp.'
    },
    {
        id: 'cpu',
        title: 'CPU BRAIN INSTALLATION',
        component: 'CPU',
        warning: {
            type: 'critical',
            text: 'ALIGN THE TRIANGLE! The small golden triangle on the CPU MUST match the triangle on the motherboard socket.'
        },
        steps: [
            'Lift the CPU socket retention lever on the motherboard.',
            'Hold the CPU by its edges ONLY; never touch the pins or contact pads.',
            'Carefully align the CPU triangle/notches with the socket markers.',
            'Gently lower the CPU into the socket. It should fall into place with ZERO force.',
            'DO NOT press down on the CPU. If it doesn\'t seat, check alignment.',
            'Lower the retention lever until it clicks into the hook.',
            'The plastic protective cap should pop off automatically (keep it for warranty/shipping).',
            'Verify the CPU is flat and secure.',
            'Prepare thermal paste if your cooler doesn\'t have it pre-applied (wait for cooler step).'
        ],
        explanation: 'The CPU is the most delicate part of the build. Modern sockets use a "zero insertion force" design, so if you feel resistance, something is wrong.',
        proTips: 'Wait until the very last second to remove the CPU from its plastic clamshell to minimize dust exposure.',
        commonMistakes: 'Applying force to seat a CPU can bend pins (Intel/LGA) or damage the socket (AMD/PGA), often totaling the board.',
        safetyWarnings: 'Static electricity is the CPU\'s worst enemy. Ground yourself by touching the metal PC case frequently.'
    },
    {
        id: 'ram',
        title: 'MEMORY (RAM) INSTALLATION',
        component: 'RAM',
        warning: {
            type: 'caution',
            text: 'Refer to your motherboard manual for the correct "Dual Channel" slots. Usually, this is slots 2 and 4 (counting from the CPU).'
        },
        steps: [
            'Open the retention clips on the desired RAM slots.',
            'Align the notch on the RAM stick with the divider in the slot.',
            'The notch is off-center, so there is only ONE correct orientation.',
            'Place the RAM stick vertically over the slot.',
            'Apply firm, even pressure on both ends of the stick.',
            'The clips should click into place automatically.',
            'Ensure the RAM is fully seated and the clips are locked.',
            'Repeat for any additional sticks.',
            'Check that all sticks are pushed down to the same height.'
        ],
        explanation: 'RAM allows your computer to store short-term data. Dual-channel configuration significantly improves performance by doubling the data bandwidth.',
        proTips: 'Modern DDR5 RAM can require a surprising amount of force to click into place—don\'t be too afraid as long as it\'s aligned.',
        commonMistakes: 'Not pushing the RAM in all the way is a leading cause of systems failing to boot (No POST).',
        safetyWarnings: 'Ensure the system is completely unpowered before adding or removing RAM.'
    },
    {
        id: 'ssd',
        title: 'M.2 SSD INSTALLATION',
        component: 'SSD',
        warning: {
            type: 'caution',
            text: 'M.2 screws are incredibly tiny. Use a magnetized PH0 or PH00 screwdriver to avoid losing them inside the motherboard.'
        },
        steps: [
            'Locate the primary M.2 slot (closest to the CPU for best speed).',
            'If there is a heatsink, unscrew and remove it.',
            'Check for a thermal pad under the heatsink; remove its plastic film.',
            'Insert the M.2 SSD into the slot at a 30-degree angle.',
            'Push the SSD down flat against the standoff or latch.',
            'Secure it with the tiny screw or the plastic "M.2 Latch" mechanism.',
            'If you removed a heatsink, place it back over the SSD.',
            'Tighten the heatsink screws moderately.',
            'Verify the SSD is not "bending" excessively.'
        ],
        explanation: 'M.2 NVMe SSDs provide lightning-fast storage. Installing them now prevents having to work around a large CPU cooler or GPU later.',
        proTips: 'Some motherboards have multiple M.2 slots; always use the top one first as it usually connects directly to the CPU.',
        commonMistakes: 'Leaving the plastic film on the thermal pad will cause the SSD to overheat under load.',
        safetyWarnings: 'Do not overtighten the tiny M.2 screw; it is easy to strip the threads.'
    },
    {
        id: 'cooler',
        title: 'CPU COOLER MOUNTING',
        component: 'CPU COOLER',
        warning: {
            type: 'critical',
            text: 'REMOVE THE PLASTIC FILM from the bottom of the cooler! Failure to do so will cause the CPU to overheat instantly.'
        },
        steps: [
            'If your cooler has pre-applied thermal paste, skip to step 3.',
            'Apply a "pea-sized" amount of thermal paste to the center of the CPU.',
            'Install the mounting brackets or backplate provided with your cooler.',
            'Lower the cooler onto the CPU, aligning the mounting screws.',
            'Tighten the screws in a "Cross Pattern" (top-left, bottom-right, etc.).',
            'Only tighten a few turns at a time to ensure even pressure.',
            'Tighten until firm—do not use excessive force.',
            'Connect the cooler\'s fan cable to the "CPU_FAN" header on the motherboard.',
            'If using an AIO, connect the pump cable to "AIO_PUMP" or "CPU_OPT".'
        ],
        explanation: 'The cooler draws heat away from the CPU. Even pressure is critical for a good thermal seal between the CPU and the cooler base.',
        proTips: '"Tight" means finger-tight plus a quarter turn. Most modern coolers have built-in stops to prevent over-tightening.',
        commonMistakes: 'Using too much thermal paste (messy) or too little (unreliable) can both lead to higher temperatures.',
        safetyWarnings: 'Air cooler fins are very thin and can easily cut your fingers if you slip.'
    },
    {
        id: 'mobo_install',
        title: 'MOTHERBOARD INSTALLATION',
        component: 'MOTHERBOARD',
        warning: {
            type: 'caution',
            text: 'Double-check that your case standoffs align exactly with the motherboard holes. Remove any extra standoffs that might short the board.'
        },
        steps: [
            'If not pre-installed, snap the I/O shield into the rear case cutout.',
            'Gently lower the motherboard into the case at an angle.',
            'Slide the I/O ports into the shield/cutout.',
            'Align the motherboard holes with the standoffs.',
            'Ensure no wires are trapped underneath the board.',
            'Use the specific "M3" or "6-32" screws provided with the CASE.',
            'Install the center screw first to hold the board in place.',
            'Install the remaining screws; do not overtighten.',
            'Connect the 24-pin and 8-pin power cables from the PSU now.'
        ],
        explanation: 'This is the moment the build comes together. The motherboard links every other component, so internal case stability is paramount.',
        proTips: 'Magnetic screwdrivers are essential here to prevent screws from falling behind the motherboard.',
        commonMistakes: 'Misaligning the I/O pins so they stick into the USB/Ethernet ports instead of around them.',
        safetyWarnings: 'Avoid scraping the bottom of the motherboard against the standoffs during alignment.'
    },
    {
        id: 'hdd',
        title: 'STORAGE (HDD/SATA SSD)',
        component: 'STORAGE',
        warning: {
            type: 'caution',
            text: 'HDDs are mechanical and sensitive to vibration and shock. Handle them gently and secure them tightly.'
        },
        steps: [
            'Identify the drive bays or mounting sleds in your case.',
            'Slide the HDD/SSD into the sled and secure with screws.',
            'Slide the sled into the drive cage until it clicks.',
            'Locate a SATA Power cable from the PSU.',
            'Plug the SATA Power cable into the drive (the wider L-shaped connector).',
            'Locate a SATA Data cable (usually in the motherboard box).',
            'Plug the SATA Data cable into the drive (the smaller L-shaped connector).',
            'Plug the other end of the data cable into a SATA port on the motherboard.',
            'Group the cables for better routing.'
        ],
        explanation: 'While M.2 is faster, SATA drives provide high-capacity storage for library files, games, and backups at a lower cost.',
        proTips: 'Plan your SATA port usage; some motherboards disable certain SATA ports if specific M.2 slots are used.',
        commonMistakes: 'Plugging in the data cable but forgetting the power cable—the drive won\'t show up in BIOS.',
        safetyWarnings: 'Never move an HDD while it is powered on and spinning.'
    },
    {
        id: 'gpu',
        title: 'GRAPHICS CARD (GPU) INSTALLATION',
        component: 'GPU',
        warning: {
            type: 'critical',
            text: 'The GPU latch on the PCIe slot must "click". Do not forget to plug in the PCIe power cables—many modern cards need 2 or 3 separate cables.'
        },
        steps: [
            'Locate the top PCIe x16 slot (closest to the CPU).',
            'Unscrew and remove the corresponding expansion slot covers from the case.',
            'Open the plastic latch at the end of the PCIe slot.',
            'Align the GPU contact edge with the slot.',
            'Press down firmly until the latch clicks and the card is seated.',
            'Secure the GPU bracket to the case using the screws you removed earlier.',
            'Identify the correct PCIe power cables (labeled PCI-E or VGA).',
            'Plug the power cables into the GPU; ensure they are fully clicked in.',
            'Avoid using "pigtail" cables for high-power cards; use separate cables if possible.'
        ],
        explanation: 'The GPU is often the largest and heaviest component. It provides the graphical power for gaming, editing, and rendering.',
        proTips: 'If the GPU is heavy and sags, consider using a support bracket to prevent damage to the PCIe slot over time.',
        commonMistakes: 'Using a lower PCIe slot; most secondary slots have lower bandwidth and will slow down your GPU.',
        safetyWarnings: 'Modern GPUs get very hot. Allow them to cool down before touching them after use.'
    },
    {
        id: 'fans',
        title: 'CASE FANS & CABLE FINALIZATION',
        component: 'CASE FANS',
        warning: {
            type: 'caution',
            text: 'Verify the airflow direction! Most fans have small arrows on the side showing the direction of air travel and blade rotation.'
        },
        steps: [
            'Mount intake fans at the front/bottom (pulling air IN).',
            'Mount exhaust fans at the rear/top (pushing air OUT).',
            'Identify fan headers (SYS_FAN or CHA_FAN) on the motherboard.',
            'Use a fan hub or splitter if you have more fans than headers.',
            'Connect all front panel connectors (Power SW, LED, USB).',
            'Perform a final check of all power connections (CPU, ATX, GPU).',
            'Use zip ties or velcro straps to bundle cables and clear them from fan blades.',
            'Check that no cables are touching heatsinks or moving parts.',
            'Give the interior a final visual inspection for loose screws or tools.'
        ],
        explanation: 'Proper airflow (Intake vs. Exhaust) is vital to keep your components cool and prevent thermal throttling.',
        proTips: '"Positive Pressure" (more intake than exhaust) helps prevent dust from entering through gaps in the case.',
        commonMistakes: 'Installing all fans as exhaust, which creates a vacuum and starves components of fresh air.',
        safetyWarnings: 'Ensure fan cables are tucked away; they can be shredded if they hit spinning blades.'
    }
];

const WarningBox = ({ type, text }) => {
    const isCritical = type === 'critical';
    return (
        <div className={`mb-8 p-4 rounded-lg border-2 flex items-start space-x-4 ${isCritical
                ? 'bg-red-500/10 border-red-500 text-red-100'
                : 'bg-yellow-500/10 border-yellow-500 text-yellow-100'
            }`}>
            <div className={`mt-1 p-1 rounded-full ${isCritical ? 'bg-red-500' : 'bg-yellow-500'}`}>
                {isCritical ? (
                    <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
            </div>
            <div>
                <p className="font-mono text-xs font-black uppercase tracking-widest mb-1">
                    {isCritical ? 'CRITICAL_WARNING' : 'CAUTION_NOTE'}
                </p>
                <p className="text-sm font-medium leading-relaxed">{text}</p>
            </div>
        </div>
    );
};

const GuidePage = () => {
    const navigate = useNavigate();
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { role: 'ai', text: 'SYNC_COMPLETE. I am your assembly assistant. How can I help you today?' }
    ]);
    const [chatInput, setChatInput] = useState('');

    const currentStep = ASSEMBLY_STEPS[currentStepIndex];

    const handleNext = () => {
        if (currentStepIndex < ASSEMBLY_STEPS.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
            window.scrollTo(0, 0);
        } else {
            navigate('/assemble');
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
            window.scrollTo(0, 0);
        }
    };

    const handleSpeak = () => {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const intro = `Step ${currentStepIndex + 1}: ${currentStep.title}. `;
            const textToSpeak = intro + currentStep.steps.join('. ') + '. ' + currentStep.explanation;

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        } else {
            alert('Speech synthesis not supported in this browser.');
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const newMessages = [...chatMessages, { role: 'user', text: chatInput }];
        setChatMessages(newMessages);
        setChatInput('');

        // Simulate AI response
        setTimeout(() => {
            let aiResponse = "PROCESSING_REQUEST... I recommend checking the manual for specific torque specifications.";

            const input = chatInput.toLowerCase();
            if (input.includes('cpu') || input.includes('triangle')) {
                aiResponse = "CRITICAL: Ensure the CPU triangle matches the motherboard socket marker exactly. Do not apply pressure.";
            } else if (input.includes('ram')) {
                aiResponse = "ADVICE: Use dual-channel slots (usually 2 and 4) for optimal memory performance.";
            } else if (input.includes('gpu') || input.includes('graphics')) {
                aiResponse = "GUIDANCE: Connect separate PCIe power cables from the PSU. The card should click firmly into the slot.";
            } else if (input.includes('fan')) {
                aiResponse = "FLOW_CHECK: Front fans should be intake (pulling air), and rear/top fans should be exhaust (pushing air).";
            }

            setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
        }, 1000);
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-[#eeeeee] relative">
            {/* Header */}
            <header className="border-b-2 border-[#333] pb-4 mb-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none">
                            GUIDED_<span className="text-[#00ff88]">ASSEMBLY</span>
                        </h1>
                        <p className="text-[10px] font-mono text-[#666] mt-2 uppercase tracking-[0.2em]">
                            // STEP_{String(currentStepIndex + 1).padStart(2, '0')} // {currentStep.component} // VERSION_1.0
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        {ASSEMBLY_STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-8 h-1 ${idx <= currentStepIndex ? 'bg-[#00ff88]' : 'bg-[#1a1a1a]'}`}
                            ></div>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full pb-32">
                {/* Step Navigation Top (Mobile Friendly) */}
                <div className="md:hidden flex justify-between mb-6">
                    <button
                        onClick={handleBack}
                        disabled={currentStepIndex === 0}
                        className={`text-[10px] font-mono uppercase tracking-widest ${currentStepIndex === 0 ? 'text-[#333]' : 'text-[#888]'}`}
                    >
                        ← PREV_MODULE
                    </button>
                    <span className="text-[10px] font-mono text-[#00ff88]">
                        PROGRESS: {Math.round(((currentStepIndex + 1) / ASSEMBLY_STEPS.length) * 100)}%
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Left Column: Instructions */}
                    <div className="lg:col-span-2 space-y-8">
                        <WarningBox type={currentStep.warning.type} text={currentStep.warning.text} />

                        <div className="bg-[#0a0a0a] border border-[#333] p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff88] opacity-5 -mr-16 -mt-16 rounded-full blur-3xl"></div>

                            <h2 className="text-2xl font-black mb-8 border-l-4 border-[#00ff88] pl-4 uppercase tracking-tight">
                                {currentStep.title}
                            </h2>

                            <div className="space-y-6">
                                {currentStep.steps.map((step, idx) => (
                                    <div key={idx} className="flex space-x-4 items-start group/item">
                                        <span className="font-mono text-[#00ff88] text-xs font-black mt-1 bg-[#111] px-2 py-1 border border-[#333] min-w-[32px] text-center">
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                        <p className="text-sm md:text-base text-[#ccc] group-hover/item:text-[#eeeeee] transition-colors leading-relaxed">
                                            {step}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12 pt-8 border-t border-[#1a1a1a]">
                                <h4 className="font-mono text-[10px] text-[#555] mb-4 tracking-[0.3em] uppercase">SYSTEM_EXPLANATION</h4>
                                <p className="text-sm font-medium italic text-[#888] leading-relaxed">
                                    "{currentStep.explanation}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Tips & AI Actions */}
                    <div className="space-y-6">
                        {/* Voice Instruction Button */}
                        <button
                            onClick={handleSpeak}
                            className="w-full bg-[#00ff88] hover:bg-[#00cc6e] text-black p-5 flex items-center justify-center space-x-3 transition-all active:scale-95 group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            <span className="font-black font-mono text-xs uppercase tracking-widest">Get AI Voice Instructions</span>
                        </button>

                        {/* Pro Tips Card */}
                        <div className="bg-[#050505] border border-[#333] p-6 relative">
                            <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center">
                                <div className="w-1 h-1 bg-[#00ff88]"></div>
                            </div>
                            <h4 className="font-mono text-[10px] text-[#00ff88] mb-4 tracking-widest uppercase">// PRO_TIPS</h4>
                            <p className="text-xs text-[#aaa] leading-relaxed mb-6 font-medium">
                                {currentStep.proTips}
                            </p>

                            <h4 className="font-mono text-[10px] text-red-500 mb-4 tracking-widest uppercase">// COMMON_MISTAKES</h4>
                            <p className="text-xs text-[#aaa] leading-relaxed mb-6 font-medium">
                                {currentStep.commonMistakes}
                            </p>

                            <h4 className="font-mono text-[10px] text-yellow-500 mb-4 tracking-widest uppercase">// SAFETY_PROTOCOL</h4>
                            <p className="text-xs text-[#aaa] leading-relaxed font-medium">
                                {currentStep.safetyWarnings}
                            </p>
                        </div>

                        {/* Visual Progress Card */}
                        <div className="bg-[#111] border border-[#333] p-6">
                            <div className="flex justify-between items-baseline mb-4">
                                <span className="font-mono text-[10px] text-[#555] uppercase tracking-widest">ASSEMBLY_LOAD</span>
                                <span className="font-mono text-xl text-[#eeeeee] font-black">{Math.round(((currentStepIndex + 1) / ASSEMBLY_STEPS.length) * 100)}%</span>
                            </div>
                            <div className="w-full h-8 bg-[#050505] border border-[#333] p-1 flex gap-1">
                                {ASSEMBLY_STEPS.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 ${i <= currentStepIndex ? 'bg-[#00ff88]' : 'bg-[#1a1a1a]'} transition-colors duration-500`}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#050505] border-t-2 border-[#333] p-6 z-40 backdrop-blur-md bg-opacity-90">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <button
                        onClick={handleBack}
                        disabled={currentStepIndex === 0}
                        className={`flex items-center space-x-3 px-6 py-3 border transition-all ${currentStepIndex === 0
                                ? 'border-[#1a1a1a] text-[#333] cursor-not-allowed'
                                : 'border-[#333] text-[#888] hover:text-[#eeeeee] hover:border-[#eeeeee]'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="font-mono text-xs font-black uppercase tracking-widest">Back</span>
                    </button>

                    <div className="hidden md:block">
                        <span className="font-mono text-[10px] text-[#444] tracking-[0.5em] uppercase">
                            MODULAR_CONSTRUCTION_SEQUENCER
                        </span>
                    </div>

                    <button
                        onClick={handleNext}
                        className="flex items-center space-x-3 px-8 py-3 bg-[#eeeeee] text-black hover:bg-[#00ff88] transition-all transform active:scale-95"
                    >
                        <span className="font-mono text-xs font-black uppercase tracking-widest">
                            {currentStepIndex === ASSEMBLY_STEPS.length - 1 ? 'Finish' : 'Next Step'}
                        </span>
                        {currentStepIndex !== ASSEMBLY_STEPS.length - 1 && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        )}
                    </button>
                </div>
            </nav>

            {/* AI Chat Button */}
            <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`fixed bottom-24 right-8 w-14 h-14 rounded-full flex items-center justify-center transition-all z-50 shadow-lg ${isChatOpen ? 'bg-red-500 text-white rotate-90' : 'bg-[#00ff88] text-black hover:scale-110'
                    }`}
            >
                {isChatOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                )}
            </button>

            {/* AI Chat Panel */}
            <div className={`fixed top-0 right-0 h-full w-full md:w-96 bg-[#0a0a0a] border-l-2 border-[#333] z-40 transition-transform duration-500 ease-in-out transform ${isChatOpen ? 'translate-x-0' : 'translate-x-full'
                } flex flex-col shadow-2xl shadow-black`}>
                <div className="p-6 border-b border-[#333] bg-[#050505]">
                    <h3 className="text-xl font-black uppercase tracking-tighter">AI_ASSISTANT</h3>
                    <p className="text-[10px] font-mono text-[#00ff88] uppercase tracking-widest">Operational // Real-time Support</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-sm bg-grid-pattern">
                    {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <span className="text-[9px] text-[#555] mb-1 uppercase tracking-tighter">
                                {msg.role === 'ai' ? '[SYSTEM_CORE]' : '[USER_INPUT]'}
                            </span>
                            <div className={`max-w-[85%] p-3 border ${msg.role === 'user'
                                    ? 'bg-[#111] border-[#333] text-[#eeeeee]'
                                    : 'bg-[#00ff88]/5 border-[#00ff88]/30 text-[#00ff88]'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSendMessage} className="p-6 border-t border-[#333] bg-[#050505]">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="TYPE_MESSAGE..."
                            className="flex-1 bg-transparent border border-[#333] p-3 text-xs font-mono focus:border-[#00ff88] outline-none transition-colors"
                        />
                        <button
                            type="submit"
                            className="bg-[#00ff88] text-black px-4 font-black text-xs uppercase hover:bg-[#00cc6e] transition-colors"
                        >
                            Send
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .bg-grid-pattern {
                    background-image: radial-gradient(#1a1a1a 1px, transparent 1px);
                    background-size: 20px 20px;
                }
            `}</style>
        </div>
    );
};

export default GuidePage;
