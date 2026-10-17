import { useId } from "react";

export const MASCOTS = [
  {
    kind: "lion",
    name: "Leo",
    gospel: "Mark",
    personality: "Brave heart. Big energy.",
    color: "#E5A138",
    bg: "#FFF0CF",
  },
  {
    kind: "ox",
    name: "Lou",
    gospel: "Luke",
    personality: "Steady, kind & surprisingly clever.",
    color: "#BA7956",
    bg: "#F9E5DB",
  },
  {
    kind: "eagle",
    name: "Juno",
    gospel: "John",
    personality: "Big ideas. A bird’s-eye view.",
    color: "#668BB2",
    bg: "#DFEBF8",
  },
  {
    kind: "human",
    name: "Mattie",
    gospel: "Matthew",
    personality: "Curious mind. A little mischief.",
    color: "#9380BA",
    bg: "#EDE5F6",
  },
];

const ink = "#654538";

function Wings({ wide = false }) {
  return (
    <g
      className="mascot-wings"
      fill="#FFF9E9"
      stroke={ink}
      strokeWidth="2.7"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <g
        className="mascot-wing mascot-wing-left"
        style={{ transformOrigin: "67px 119px" }}
      >
        <path
          d={
            wide
              ? "M72 125C45 130 17 105 10 78C8 70 13 67 19 75L32 89C20 64 29 61 36 73L48 88C42 66 51 67 56 78L75 111Z"
              : "M73 133C50 136 28 118 25 94C24 86 28 83 34 90L44 103C38 83 45 81 51 91L61 106C61 91 69 94 71 105L77 125Z"
          }
        />
        <path
          d="M38 111Q47 123 61 126M47 105Q53 116 64 119"
          fill="none"
          stroke="#DCCAB0"
          strokeWidth="2"
        />
      </g>
      <g
        className="mascot-wing mascot-wing-right"
        style={{ transformOrigin: "133px 119px" }}
      >
        <path
          d={
            wide
              ? "M128 125C155 130 183 105 190 78C192 70 187 67 181 75L168 89C180 64 171 61 164 73L152 88C158 66 149 67 144 78L125 111Z"
              : "M127 133C150 136 172 118 175 94C176 86 172 83 166 90L156 103C162 83 155 81 149 91L139 106C139 91 131 94 129 105L123 125Z"
          }
        />
        <path
          d="M162 111Q153 123 139 126M153 105Q147 116 136 119"
          fill="none"
          stroke="#DCCAB0"
          strokeWidth="2"
        />
      </g>
    </g>
  );
}

function Eyes({ y = 85, left = 81, right = 119, mood }) {
  return (
    <g className="mascot-eyes">
      {mood === "sleepy" ? (
        <g fill="none" stroke={ink} strokeWidth="4.5" strokeLinecap="round">
          <path d={`M${left - 5} ${y}q5 5 10 0`} />
          <path d={`M${right - 5} ${y}q5 5 10 0`} />
        </g>
      ) : (
        <>
          <ellipse cx={left} cy={y} rx="5" ry="7" fill={ink} />
          <ellipse cx={right} cy={y} rx="5" ry="7" fill={ink} />
          <circle cx={left + 1.5} cy={y - 2.5} r="1.7" fill="white" />
          <circle cx={right + 1.5} cy={y - 2.5} r="1.7" fill="white" />
        </>
      )}
    </g>
  );
}

function Cheeks({ y = 99, left = 70, right = 130, color = "#EF9C76" }) {
  return (
    <g fill={color} opacity=".67">
      <ellipse cx={left} cy={y} rx="8" ry="4.5" />
      <ellipse cx={right} cy={y} rx="8" ry="4.5" />
    </g>
  );
}

function Lion({ mood, gradient }) {
  return (
    <>
      <path
        className="mascot-tail"
        d="M130 153C162 169 177 151 165 139"
        fill="none"
        stroke={ink}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        className="mascot-tail"
        d="M130 153C162 169 177 151 165 139"
        fill="none"
        stroke="#EFB64E"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M160 139C156 132 159 125 165 123C171 128 175 135 170 140C167 144 163 143 160 139Z"
        fill="#B96B35"
        stroke={ink}
        strokeWidth="3"
      />
      <Wings />
      <path
        d="M71 117Q99 104 127 119L137 159Q134 174 100 175Q65 174 64 157Z"
        fill="#F0B64E"
        stroke={ink}
        strokeWidth="3"
      />
      <ellipse cx="101" cy="143" rx="22" ry="25" fill="#FFDF89" />
      <path
        d="M76 140L73 167M124 140L127 167"
        fill="none"
        stroke="#D99439"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M72 157C57 156 53 175 65 179H86C93 175 88 159 80 158Z"
        fill="#F5C463"
        stroke={ink}
        strokeWidth="3"
      />
      <path
        d="M126 157C141 156 145 175 133 179H112C105 175 110 159 118 158Z"
        fill="#F5C463"
        stroke={ink}
        strokeWidth="3"
      />
      <path
        d="M67 172V177M76 173V178M123 173V178M132 172V177"
        stroke="#C48A3B"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g className="mascot-head" style={{ transformOrigin: "100px 111px" }}>
        <path
          d="M99 31C108 24 121 29 126 36C139 33 150 43 150 54C161 57 166 70 160 80C168 92 162 106 154 111C156 125 144 134 132 133C124 146 111 147 100 140C87 147 74 141 69 133C55 134 46 122 48 112C35 105 34 90 41 81C35 69 40 57 51 53C50 40 64 32 76 36C82 26 94 26 99 31Z"
          fill={`url(#${gradient})`}
          stroke={ink}
          strokeWidth="3.2"
        />
        <path
          d="M56 71Q45 84 52 96M68 43Q79 36 88 40M145 106Q148 117 138 122M92 132Q103 137 113 132"
          fill="none"
          stroke="#E89A47"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle
          cx="66"
          cy="62"
          r="13"
          fill="#F5C35E"
          stroke={ink}
          strokeWidth="3"
        />
        <circle
          cx="134"
          cy="62"
          r="13"
          fill="#F5C35E"
          stroke={ink}
          strokeWidth="3"
        />
        <circle cx="66" cy="63" r="6" fill="#C98246" />
        <circle cx="134" cy="63" r="6" fill="#C98246" />
        <path
          d="M62 77C62 53 81 44 100 47C121 44 138 57 138 79L135 99C130 119 114 126 100 126C82 126 65 115 63 99Z"
          fill="#F9CD6B"
          stroke={ink}
          strokeWidth="2.8"
        />
        <path d="M88 49L94 58L101 50L107 57L113 49" fill="#E9A943" />
        <path
          d="M74 73Q80 69 86 72M114 72Q120 69 126 73"
          fill="none"
          stroke={ink}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <Eyes y={86} mood={mood} />
        <Cheeks y={100} />
        <path
          d="M80 104C78 92 94 91 100 97C108 90 122 95 120 104C118 117 105 117 100 111C93 118 81 115 80 104Z"
          fill="#FFF0C4"
        />
        <path
          d="M94 97Q100 94 106 97Q108 100 100 105Q92 100 94 97Z"
          fill={ink}
        />
        <path
          d="M100 104V109M91 108Q94 114 100 109Q107 114 110 108"
          fill="none"
          stroke={ink}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="86" cy="102" r="1" fill="#B89466" />
        <circle cx="114" cy="102" r="1" fill="#B89466" />
      </g>
    </>
  );
}

function Ox({ mood }) {
  return (
    <>
      <Wings />
      <path
        className="mascot-tail"
        d="M132 146Q164 152 159 131"
        fill="none"
        stroke={ink}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M158 133Q148 122 159 119Q169 124 158 133Z"
        fill="#B78361"
        stroke={ink}
        strokeWidth="2.5"
      />
      <path
        d="M71 116Q100 106 130 120L138 160Q133 174 100 173Q65 174 62 159Z"
        fill="#BD805E"
        stroke={ink}
        strokeWidth="3"
      />
      <path
        d="M84 121Q100 113 116 121L119 155Q103 167 82 153Z"
        fill="#EDD1AE"
      />
      <path
        d="M69 145L66 167Q68 179 86 176L88 147M113 147L114 172Q122 181 135 173L132 145"
        fill="#C78D6A"
        stroke={ink}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M66 165Q77 169 87 165V174Q78 181 67 175ZM114 165Q125 169 135 165V174Q125 181 115 175Z"
        fill="#735143"
        stroke={ink}
        strokeWidth="2.5"
      />
      <path d="M77 170V177M125 170V177" stroke="#D5B18C" strokeWidth="2" />
      <g className="mascot-head" style={{ transformOrigin: "100px 115px" }}>
        <path
          d="M63 64C41 62 42 40 50 30C49 49 58 50 73 47ZM137 64C159 62 158 40 150 30C151 49 142 50 127 47Z"
          fill="#FFF0CF"
          stroke={ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M66 72Q48 53 34 67Q39 89 64 87ZM134 72Q152 53 166 67Q161 89 136 87Z"
          fill="#BA7A58"
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M41 70Q52 66 62 78M159 70Q148 66 138 78"
          fill="none"
          stroke="#E5B396"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M61 76C61 54 77 43 100 43C123 43 139 54 139 76L135 105Q126 128 100 128Q74 128 65 105Z"
          fill="#C9906D"
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M85 48Q96 42 109 47Q116 61 110 75L102 91L89 84Q95 68 85 48Z"
          fill="#F5DFBF"
        />
        <path
          d="M83 46Q80 32 88 35L96 42Q98 26 105 34L108 42Q117 32 120 40L117 49"
          fill="#AF7051"
          stroke={ink}
          strokeWidth="2.7"
          strokeLinejoin="round"
        />
        <path
          d="M72 74Q79 70 86 73M114 73Q121 70 128 74"
          stroke={ink}
          strokeWidth="2.7"
          fill="none"
          strokeLinecap="round"
        />
        <Eyes y={85} left={80} right={120} mood={mood} />
        <Cheeks y={98} left={69} right={131} color="#D7846E" />
        <path
          d="M70 109C67 96 83 94 100 96C117 94 133 96 130 109Q128 128 100 129Q72 128 70 109Z"
          fill="#F4D2AA"
          stroke={ink}
          strokeWidth="2.7"
        />
        <ellipse
          cx="84"
          cy="107"
          rx="3.5"
          ry="4.5"
          fill="#9C6B53"
          transform="rotate(-20 84 107)"
        />
        <ellipse
          cx="116"
          cy="107"
          rx="3.5"
          ry="4.5"
          fill="#9C6B53"
          transform="rotate(20 116 107)"
        />
        <path
          d="M90 117Q100 126 110 117"
          stroke={ink}
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </>
  );
}

function Eagle({ mood }) {
  return (
    <>
      <path
        d="M83 145L77 173Q87 180 100 171Q114 180 123 173L115 145Z"
        fill="#50779A"
        stroke={ink}
        strokeWidth="3"
      />
      <Wings wide />
      <path
        d="M68 101Q99 88 132 102L139 136Q135 164 100 167Q65 164 61 136Z"
        fill="#749BBC"
        stroke={ink}
        strokeWidth="3"
      />
      <path
        d="M78 112Q100 99 122 112Q128 139 115 153Q100 166 85 153Q72 139 78 112Z"
        fill="#FFF3D9"
      />
      <path
        d="M90 132L100 137L110 132M92 144L100 148L108 144"
        fill="none"
        stroke="#E5D5B7"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M80 160L78 172L68 175Q64 181 73 181H91Q97 178 90 175L88 162M112 162L110 175Q103 178 109 181H127Q136 181 132 175L122 172L120 160"
        fill="#F0BD58"
        stroke={ink}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <g className="mascot-head" style={{ transformOrigin: "100px 108px" }}>
        <path
          d="M62 68Q59 49 77 42Q92 34 112 39Q119 25 126 29L122 42Q138 33 139 40L132 50Q145 49 142 57L135 65Q145 91 129 109L137 115L121 117L126 125L110 122L100 130L90 122L74 125L79 117L63 115L71 108Q55 91 62 68Z"
          fill="#83ACCD"
          stroke={ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M66 82Q64 60 80 62Q94 64 100 74Q107 63 121 62Q137 60 134 82L130 101Q120 116 100 118Q79 116 70 101Z"
          fill="#FFFAEB"
        />
        <path
          d="M73 72Q81 67 88 73M112 73Q120 67 127 72"
          stroke={ink}
          strokeWidth="2.7"
          fill="none"
          strokeLinecap="round"
        />
        <Eyes y={84} mood={mood} />
        <Cheeks y={97} left={73} right={127} color="#EAA58A" />
        <path
          d="M89 99Q100 88 111 99L108 107Q100 119 92 107Z"
          fill="#F5BC4C"
          stroke={ink}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path
          d="M90 101Q100 107 110 101"
          fill="none"
          stroke={ink}
          strokeWidth="2.2"
        />
        <path
          d="M96 97Q100 94 104 97"
          fill="none"
          stroke="#FFE5A4"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </>
  );
}

function Human({ mood }) {
  return (
    <>
      <Wings />
      <path
        d="M79 151L75 170Q64 168 63 177Q69 183 87 178L90 153M110 153L113 178Q131 183 137 177Q136 168 125 170L121 151"
        fill="#BA805B"
        stroke={ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M76 172L86 174M114 174L124 172"
        fill="none"
        stroke="#754E3D"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M72 116Q100 104 128 116L138 162Q104 178 62 162Z"
        fill="#A393C6"
        stroke={ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M85 113Q100 125 115 113L111 105H89Z"
        fill="#EAC298"
        stroke={ink}
        strokeWidth="2.8"
      />
      <path d="M117 115L88 166L76 168L107 115Z" fill="#DBD0EA" />
      <path
        d="M76 133L71 155M124 133L129 155M95 151L91 166M110 154L113 166"
        fill="none"
        stroke="#8371AC"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M72 117Q64 116 58 126L49 143Q48 150 55 152Q62 152 66 144L78 131"
        fill="#A393C6"
        stroke={ink}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M52 143Q45 148 48 155Q52 161 59 156L64 150"
        fill="#EAC298"
        stroke={ink}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <g className="mascot-wave" style={{ transformOrigin: "125px 124px" }}>
        <path
          d="M125 118Q131 112 138 119L148 108L157 116L145 135Q138 142 130 133"
          fill="#A393C6"
          stroke={ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M147 109L146 99Q146 94 150 96L153 102L153 91Q155 86 158 91L160 101L163 94Q166 91 167 96L165 105Q174 99 174 104Q173 111 159 118Z"
          fill="#EAC298"
          stroke={ink}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g className="mascot-head" style={{ transformOrigin: "100px 106px" }}>
        <ellipse
          cx="100"
          cy="28"
          rx="29"
          ry="7"
          fill="none"
          stroke="#DDA94B"
          strokeWidth="5"
        />
        <ellipse
          cx="100"
          cy="27"
          rx="29"
          ry="7"
          fill="none"
          stroke="#F9DA80"
          strokeWidth="2.5"
        />
        <path
          d="M61 83Q48 74 55 60Q48 49 63 43Q62 28 80 31Q89 21 101 31Q115 21 123 33Q141 30 142 46Q154 52 146 67Q151 80 138 86Z"
          fill="#77503D"
          stroke={ink}
          strokeWidth="3"
        />
        <circle
          cx="62"
          cy="86"
          r="10"
          fill="#E7B88D"
          stroke={ink}
          strokeWidth="2.7"
        />
        <circle
          cx="138"
          cy="86"
          r="10"
          fill="#E7B88D"
          stroke={ink}
          strokeWidth="2.7"
        />
        <path
          d="M63 70Q66 49 100 49Q134 49 137 70L135 93Q132 117 100 122Q68 117 65 93Z"
          fill="#EDC49B"
          stroke={ink}
          strokeWidth="2.8"
        />
        <path
          d="M62 71Q57 54 71 49Q72 36 87 42Q99 31 108 43Q124 35 129 49Q142 52 137 70Q128 71 124 57Q115 66 104 55Q91 67 83 56Q75 72 62 71Z"
          fill="#77503D"
          stroke={ink}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M69 51Q73 44 80 48M93 44Q99 40 104 45M123 46Q129 43 132 50"
          fill="none"
          stroke="#95684D"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M74 74Q81 70 87 74M113 74Q119 70 126 74"
          stroke={ink}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <Eyes y={86} mood={mood} />
        <Cheeks y={100} color="#DF9479" />
        <path
          d="M98 91L96 98Q99 101 103 98"
          fill="none"
          stroke="#C18A65"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M89 105Q100 117 111 105Z"
          fill={ink}
          stroke={ink}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M94 111Q100 107 106 111Q100 116 94 111Z" fill="#EAA294" />
      </g>
    </>
  );
}

export default function Mascot({
  kind = "lion",
  className = "",
  mood = "happy",
  ...props
}) {
  const id = useId().replaceAll(":", "");
  const gradient = `mane-${id}`;
  const Character =
    { lion: Lion, ox: Ox, eagle: Eagle, human: Human }[kind] || Lion;
  const companion =
    MASCOTS.find((mascot) => mascot.kind === kind) || MASCOTS[0];
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${companion.name}, the ${kind} companion of ${companion.gospel}`}
      className={`mascot mascot-${kind} ${className}`}
      {...props}
    >
      <defs>
        <linearGradient
          id={gradient}
          x1="55"
          y1="40"
          x2="135"
          y2="142"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D58A3E" />
          <stop offset="1" stopColor="#B66A32" />
        </linearGradient>
      </defs>
      <ellipse
        className="mascot-shadow"
        cx="100"
        cy="183"
        rx="47"
        ry="6"
        fill="#654538"
        opacity=".09"
      />
      <g className="mascot-body">
        <Character mood={mood} gradient={gradient} />
      </g>
    </svg>
  );
}
