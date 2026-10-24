type Props = {
  input: number;
  output: number;
  total: number;
};

export default function UsageLine({ input, output, total }: Props) {
  return (
    <p className="usage">
      Tokens: input {input} · output {output} · total {total}
    </p>
  );
}
