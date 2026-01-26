
export default function textAbbr(text: string, maxLength: number) {
    return text.substring(0, maxLength) + '...';
}